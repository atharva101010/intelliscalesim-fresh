from fastapi import APIRouter, HTTPException
from docker import DockerClient
from docker.errors import DockerException
from docker.utils import parse_repository_tag
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
        containers = docker_client.containers.list(all=False)
        
        container_list = []
        for container in containers:
            try:
                info = ContainerInfo(container)
                container_info_dict = info.to_dict()
                container_info_dict['http_url'] = _get_http_url(info.ports)
                container_list.append(container_info_dict)
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

def _get_http_url(ports):
    """Generate HTTP URL from ports"""
    if not ports:
        return None
    
    for port_mapping in ['80/tcp', '8080/tcp', '3000/tcp', '5000/tcp', '8000/tcp']:
        if port_mapping in ports:
            host_port = ports[port_mapping]
            return f"http://localhost:{host_port}"
    
    return None

@router.get("/get/{container_name}")
async def get_container(container_name: str):
    """Get details for a specific container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        info = ContainerInfo(container)
        container_dict = info.to_dict()
        container_dict['http_url'] = _get_http_url(info.ports)
        return container_dict
    
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
        
        stats = container.stats(stream=False)
        
        cpu_percent = 0.0
        memory_usage = 0
        memory_limit = 0
        
        if stats:
            cpu_delta = stats['cpu_stats'].get('cpu_usage', {}).get('total_usage', 0) - \
                       stats['precpu_stats'].get('cpu_usage', {}).get('total_usage', 0)
            system_delta = stats['cpu_stats'].get('system_cpu_usage', 0) - \
                          stats['precpu_stats'].get('system_cpu_usage', 0)
            
            if system_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * 100.0
            
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
    """Deploy a new container with optional private registry credentials"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        image = request.get('image')
        container_name = request.get('container_name')
        ports = request.get('ports', {})
        
        username = request.get('registry_username')
        password = request.get('registry_password')
        registry = request.get('registry', 'docker.io')
        
        if not image or not container_name:
            raise HTTPException(status_code=400, detail="Image and container name are required")
        
        try:
            if username and password:
                logger.info(f"🔐 Pulling private image with credentials: {image}")
                docker_client.images.pull(
                    image,
                    auth_config={
                        'username': username,
                        'password': password,
                        'registry': registry
                    }
                )
            else:
                logger.info(f"📥 Pulling public image: {image}")
                docker_client.images.pull(image)
            
            logger.info(f"✅ Successfully pulled image: {image}")
        except Exception as e:
            logger.warning(f"⚠️ Image pull warning: {str(e)}")
        
        container = docker_client.containers.run(
            image,
            name=container_name,
            ports=ports,
            detach=True,
            restart_policy={"Name": "unless-stopped"}
        )
        
        http_url = _get_http_url(ports)
        
        logger.info(f"✅ Container deployed: {container_name}")
        
        return {
            "success": True,
            "container_id": container.id[:12],
            "container_name": container_name,
            "image": image,
            "http_url": http_url,
            "message": f"Container {container_name} deployed successfully!{' Access at: ' + http_url if http_url else ''}"
        }
    
    except Exception as e:
        logger.error(f"❌ Error deploying container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start/{container_name}")
async def start_container(container_name: str):
    """Start a stopped container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        
        if container.status == 'running':
            return {
                "success": True,
                "message": f"Container {container_name} is already running"
            }
        
        container.start()
        logger.info(f"✅ Container started: {container_name}")
        
        return {
            "success": True,
            "message": f"Container {container_name} started successfully!"
        }
    
    except Exception as e:
        logger.error(f"❌ Error starting container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pause/{container_name}")
async def pause_container(container_name: str):
    """Pause a running container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        
        if container.status == 'paused':
            return {
                "success": True,
                "message": f"Container {container_name} is already paused"
            }
        
        container.pause()
        logger.info(f"⏸️ Container paused: {container_name}")
        
        return {
            "success": True,
            "message": f"Container {container_name} paused successfully!"
        }
    
    except Exception as e:
        logger.error(f"❌ Error pausing container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resume/{container_name}")
async def resume_container(container_name: str):
    """Resume a paused container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        
        if container.status == 'running':
            return {
                "success": True,
                "message": f"Container {container_name} is already running"
            }
        
        container.unpause()
        logger.info(f"▶️ Container resumed: {container_name}")
        
        return {
            "success": True,
            "message": f"Container {container_name} resumed successfully!"
        }
    
    except Exception as e:
        logger.error(f"❌ Error resuming container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop/{container_name}")
async def stop_container(container_name: str):
    """Stop a running container"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        container.stop()
        logger.info(f"⏹️ Container stopped: {container_name}")
        
        return {
            "success": True,
            "message": f"Container {container_name} stopped successfully!"
        }
    
    except Exception as e:
        logger.error(f"❌ Error stopping container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{container_name}")
async def delete_container(container_name: str, force: bool = False):
    """Delete/remove a container with optional force remove"""
    if not docker_client:
        raise HTTPException(status_code=500, detail="Docker daemon is not accessible")
    
    try:
        container = docker_client.containers.get(container_name)
        
        # Force remove if requested or if container is stuck in restarting state
        if force or container.status in ['restarting', 'removing']:
            logger.info(f"🔨 Force removing container: {container_name}")
            container.remove(force=True)
            logger.info(f"✅ Container force deleted: {container_name}")
        else:
            # Try graceful stop first
            if container.status == 'running':
                container.stop()
                logger.info(f"⏹️ Stopped container: {container_name}")
            
            # Then remove
            container.remove()
            logger.info(f"✅ Container deleted: {container_name}")
        
        return {
            "success": True,
            "message": f"Container {container_name} deleted successfully!"
        }
    
    except Exception as e:
        logger.error(f"❌ Error deleting container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

