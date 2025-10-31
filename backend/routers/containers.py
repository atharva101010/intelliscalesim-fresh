from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import docker
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/containers", tags=["containers"])

# Initialize Docker client
try:
    client = docker.from_env()
except Exception as e:
    logger.error(f"Failed to connect to Docker: {e}")
    client = None

class RegistryCredentials(BaseModel):
    use_private: bool = False
    registry_url: str = ""
    username: str = ""
    password_token: str = ""

class PortMapping(BaseModel):
    container_port: int
    host_port: int

class DeployContainerRequest(BaseModel):
    image_name: str
    container_name: str
    port_mappings: list[PortMapping] = []
    registry_credentials: RegistryCredentials

class ContainerInfo(BaseModel):
    id: str
    name: str
    image: str
    status: str
    ports: dict
    access_url: str = ""
    cpu_usage: float = 0.0
    memory_usage: str = "0MB"

@router.post("/deploy")
async def deploy_container(request: DeployContainerRequest):
    """Deploy a new Docker container"""
    if not client:
        raise HTTPException(status_code=500, detail="Docker client not available")
    
    try:
        logger.info(f"🐳 Deploying container: {request.container_name}")
        
        # Handle private registry
        image = request.image_name
        if request.registry_credentials.use_private and request.registry_credentials.registry_url:
            image = f"{request.registry_credentials.registry_url}/{request.image_name}"
            
            # Pull with credentials if private
            try:
                logger.info(f"🔐 Pulling private image: {image}")
                client.images.pull(
                    image,
                    auth_config={
                        "username": request.registry_credentials.username,
                        "password": request.registry_credentials.password_token
                    }
                )
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to pull private image: {str(e)}")
        else:
            # Pull public image
            try:
                logger.info(f"📥 Pulling public image: {image}")
                client.images.pull(image)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to pull image: {str(e)}")
        
        # Build port bindings
        ports = {}
        for pm in request.port_mappings:
            container_port = pm.container_port
            host_port = pm.host_port
            ports[f"{container_port}/tcp"] = host_port
        
        # Deploy container
        logger.info(f"🚀 Creating container: {request.container_name}")
        container = client.containers.run(
            image,
            name=request.container_name,
            ports=ports if ports else None,
            detach=True
        )
        
        logger.info(f"✅ Container deployed: {container.id}")
        
        return {
            "status": "success",
            "container_id": container.id,
            "container_name": request.container_name,
            "message": f"Container {request.container_name} deployed successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Deployment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deploy container: {str(e)}")

@router.get("/list")
async def list_containers():
    """List all containers"""
    if not client:
        raise HTTPException(status_code=500, detail="Docker client not available")
    
    try:
        containers = client.containers.list(all=True)
        container_list = []
        
        for container in containers:
            # Get port information
            ports = {}
            access_url = ""
            if container.ports:
                for container_port, host_info in container.ports.items():
                    if host_info:
                        host_port = host_info[0]["HostPort"]
                        ports[container_port] = host_port
                        if not access_url:
                            access_url = f"http://localhost:{host_port}"
            
            # Get resource usage
            try:
                stats = container.stats(stream=False)
                cpu_delta = stats["cpu_stats"]["cpu_usage"]["total_usage"] - stats["precpu_stats"]["cpu_usage"]["total_usage"]
                system_cpu_delta = stats["cpu_stats"]["system_cpu_usage"] - stats["precpu_stats"]["system_cpu_usage"]
                cpu_percent = (cpu_delta / system_cpu_delta) * len(stats["cpu_stats"]["cpus"]) * 100.0 if system_cpu_delta > 0 else 0
                memory_usage = stats["memory_stats"]["usage"] / (1024 ** 2)
            except:
                cpu_percent = 0
                memory_usage = 0
            
            container_list.append(ContainerInfo(
                id=container.id[:12],
                name=container.name,
                image=container.image.tags[0] if container.image.tags else "unknown",
                status=container.status,
                ports=ports,
                access_url=access_url,
                cpu_usage=round(cpu_percent, 2),
                memory_usage=f"{memory_usage:.2f}MB"
            ))
        
        return {"containers": container_list}
    except Exception as e:
        logger.error(f"Error listing containers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list containers: {str(e)}")

@router.post("/stop/{container_id}")
async def stop_container(container_id: str):
    """Stop a running container"""
    if not client:
        raise HTTPException(status_code=500, detail="Docker client not available")
    
    try:
        container = client.containers.get(container_id)
        container.stop()
        logger.info(f"✅ Container stopped: {container_id}")
        return {"status": "success", "message": f"Container {container_id} stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop container: {str(e)}")

@router.post("/start/{container_id}")
async def start_container(container_id: str):
    """Start a stopped container"""
    if not client:
        raise HTTPException(status_code=500, detail="Docker client not available")
    
    try:
        container = client.containers.get(container_id)
        container.start()
        logger.info(f"✅ Container started: {container_id}")
        return {"status": "success", "message": f"Container {container_id} started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start container: {str(e)}")

@router.delete("/remove/{container_id}")
async def remove_container(container_id: str):
    """Remove a container"""
    if not client:
        raise HTTPException(status_code=500, detail="Docker client not available")
    
    try:
        container = client.containers.get(container_id)
        container.remove(force=True)
        logger.info(f"✅ Container removed: {container_id}")
        return {"status": "success", "message": f"Container {container_id} removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove container: {str(e)}")
