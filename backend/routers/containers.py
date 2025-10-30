from fastapi import APIRouter, HTTPException
from docker import DockerClient
from docker.errors import DockerException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/containers", tags=["containers"])

# Initialize Docker client
try:
    docker_client = DockerClient(base_url='unix:///var/run/docker.sock')
    logger.info("✅ Docker client connected successfully")
except Exception as e:
    logger.error(f"❌ Failed to connect to Docker: {str(e)}")
    docker_client = None

class ContainerInfo:
    def __init__(self, container):
        self.id = container.id[:12]
        self.name = container.name
        self.image = container.image.tags[0] if container.image.tags else container.image.id[:12]
        self.status = container.status
        self.state = container.attrs['State']['Status']
        self.ports = self._extract_ports(container)
    
    def _extract_ports(self, container):
        """Extract port information from container"""
        ports = {}
        if container.ports:
            for port, mapping in container.ports.items():
                if mapping:
                    host_port = mapping[0]['HostPort']
                    ports[port] = host_port
        return ports
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "image": self.image,
            "status": self.status,
            "state": self.state,
            "ports": self.ports
        }

@router.get("/list")
async def list_containers():
    """Get all running Docker containers"""
    if not docker_client:
        raise HTTPException(
            status_code=500, 
            detail="Docker daemon is not accessible. Make sure Docker is running."
        )
    
    try:
        containers = docker_client.containers.list(all=False)  # Only running containers
        
        container_list = []
        for container in containers:
            try:
                info = ContainerInfo(container)
                container_list.append(info.to_dict())
            except Exception as e:
                logger.warning(f"Failed to process container {container.name}: {str(e)}")
                continue
        
        logger.info(f"✅ Found {len(container_list)} running containers")
        return {
            "success": True,
            "count": len(container_list),
            "containers": container_list
        }
    
    except DockerException as e:
        logger.error(f"❌ Docker error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Docker error: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error listing containers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get/{container_name}")
async def get_container(container_name: str):
    """Get details for a specific container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        info = ContainerInfo(container)
        return info.to_dict()
    
    except DockerException as e:
        logger.error(f"❌ Container not found: {container_name}")
        raise HTTPException(status_code=404, detail=f"Container not found: {container_name}")
    except Exception as e:
        logger.error(f"❌ Error getting container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{container_id}")
async def get_container_stats(container_id: str):
    """Get real-time stats for a container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_id)
        
        # Get stats (non-blocking)
        stats = container.stats(stream=False)
        
        # Extract CPU and memory metrics
        cpu_percent = 0.0
        memory_usage = 0
        memory_limit = 0
        
        if stats:
            # Calculate CPU percentage
            cpu_delta = stats['cpu_stats'].get('cpu_usage', {}).get('total_usage', 0) - \
                       stats['precpu_stats'].get('cpu_usage', {}).get('total_usage', 0)
            system_delta = stats['cpu_stats'].get('system_cpu_usage', 0) - \
                          stats['precpu_stats'].get('system_cpu_usage', 0)
            
            if system_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * 100.0
            
            # Get memory usage
            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 0)
        
        return {
            "container_id": container_id,
            "name": container.name,
            "cpu_percent": round(cpu_percent, 2),
            "memory_usage": memory_usage,
            "memory_limit": memory_limit,
            "memory_percent": round((memory_usage / memory_limit) * 100, 2) if memory_limit > 0 else 0
        }
    
    except DockerException as e:
        logger.error(f"❌ Container not found: {container_id}")
        raise HTTPException(status_code=404, detail=f"Container not found: {container_id}")
    except Exception as e:
        logger.error(f"❌ Error getting container stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def check_docker_health():
    """Check if Docker daemon is running"""
    if not docker_client:
        return {"docker_running": False, "message": "Docker client not initialized"}
    
    try:
        docker_client.ping()
        return {"docker_running": True, "message": "Docker daemon is healthy"}
    except Exception as e:
        logger.error(f"❌ Docker health check failed: {str(e)}")
        return {"docker_running": False, "message": str(e)}

@router.post("/deploy")
async def deploy_container(request: dict):
    """Deploy a new container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        image = request.get('image')
        container_name = request.get('container_name')
        ports = request.get('ports', {})  # e.g., {"80/tcp": 8080}
        
        if not image or not container_name:
            raise HTTPException(status_code=400, detail="Image and container name are required")
        
        # Pull image if not exists
        try:
            docker_client.images.pull(image)
            logger.info(f"✅ Pulled image: {image}")
        except Exception as e:
            logger.warning(f"Image may already exist: {str(e)}")
        
        # Deploy container
        container = docker_client.containers.run(
            image,
            name=container_name,
            ports=ports,
            detach=True,
            restart_policy={"Name": "unless-stopped"}
        )
        
        logger.info(f"✅ Container deployed: {container_name}")
        
        return {
            "success": True,
            "container_id": container.id[:12],
            "container_name": container_name,
            "message": f"Container {container_name} deployed successfully!"
        }
    
    except Exception as e:
        logger.error(f"❌ Error deploying container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{container_name}")
async def delete_container(container_name: str):
    """Delete/stop a container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        container.stop()
        container.remove()
        
        logger.info(f"✅ Container deleted: {container_name}")
        
        return {
            "success": True,
            "message": f"Container {container_name} deleted successfully!"
        }
    
    except Exception as e:
        logger.error(f"❌ Error deleting container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

