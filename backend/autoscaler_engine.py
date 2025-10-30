import docker
import asyncio
from sqlalchemy.orm import Session
from models.auto_scaling import ScalingPolicy, ScalingEvent
from database import SessionLocal

client = docker.from_env()

async def check_and_scale(policy: ScalingPolicy, db: Session):
    """Check container metrics and scale if needed"""
    
    if not policy.is_active:
        return
    
    try:
        container = client.containers.get(policy.container_id)
        
        # Get container stats
        stats = container.stats(stream=False)
        
        cpu_percent = (stats['cpu_stats']['cpu_usage']['total_usage'] / 
                      stats['cpu_stats']['system_cpu_usage']) * 100.0
        
        memory_usage = stats['memory_stats']['usage']
        memory_limit = stats['memory_stats']['limit']
        memory_percent = (memory_usage / memory_limit) * 100.0
        
        # Get current replica count
        current_replicas = len([c for c in client.containers.list() 
                               if policy.container_id in c.name])
        
        # Scale Up Logic
        if ((cpu_percent > policy.cpu_scale_up_threshold) or 
            (memory_percent > policy.memory_scale_up_threshold)):
            
            if current_replicas < policy.max_replicas:
                # Create new container
                container_image = container.attrs['Config']['Image']
                new_container = client.containers.run(
                    container_image,
                    detach=True,
                    name=f"{policy.container_id}-replica-{current_replicas + 1}",
                    ports=container.attrs['NetworkSettings']['Ports']
                )
                
                # Log scaling event
                reason = "cpu" if cpu_percent > policy.cpu_scale_up_threshold else "memory"
                event = ScalingEvent(
                    policy_id=policy.id,
                    event_type="scale_up",
                    reason=reason,
                    replicas_before=current_replicas,
                    replicas_after=current_replicas + 1
                )
                db.add(event)
                db.commit()
        
        # Scale Down Logic
        elif ((cpu_percent < policy.cpu_scale_down_threshold) and 
              (memory_percent < policy.memory_scale_down_threshold)):
            
            if current_replicas > policy.min_replicas:
                # Remove oldest container
                containers = sorted([c for c in client.containers.list() 
                                   if policy.container_id in c.name],
                                  key=lambda x: x.attrs['Created'])
                
                if containers:
                    containers[-1].stop()
                    containers[-1].remove()
                    
                    # Log scaling event
                    event = ScalingEvent(
                        policy_id=policy.id,
                        event_type="scale_down",
                        reason="cpu_memory_low",
                        replicas_before=current_replicas,
                        replicas_after=current_replicas - 1
                    )
                    db.add(event)
                    db.commit()
    
    except Exception as e:
        print(f"Error during scaling: {str(e)}")

async def run_autoscaler():
    """Main autoscaler loop"""
    while True:
        db = SessionLocal()
        
        try:
            # Get all active policies
            policies = db.query(ScalingPolicy).filter(ScalingPolicy.is_active == True).all()
            
            for policy in policies:
                await check_and_scale(policy, db)
                await asyncio.sleep(policy.check_interval_seconds)
        
        finally:
            db.close()
        
        await asyncio.sleep(10)

