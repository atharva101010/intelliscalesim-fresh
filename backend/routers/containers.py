from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import docker
from docker.errors import ImageNotFound, APIError
from datetime import datetime
import traceback
import subprocess
import os
import tempfile

from database import get_db
from models import User, Container, ContainerMetric
from schemas import ContainerCreate, ContainerResponse, ContainerMetricResponse
from auth import get_current_user

router = APIRouter(prefix="/api/containers", tags=["Containers"])

def get_docker_client():
    """Get Docker client with error handling"""
    try:
        print("🐳 Attempting to connect to Docker...")
        client = docker.from_env()
        client.ping()
        print("✅ Docker connection successful!")
        return client
    except Exception as e:
        print(f"❌ Docker connection failed: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Docker connection failed: {str(e)}"
        )

def find_available_port(client, requested_host_port):
    """Find available port if requested one is taken"""
    try:
        # Reserved ports (backend runs on 8000)
        reserved_ports = {8000, 3000, 5000}
        
        containers = client.containers.list()
        used_ports = set(reserved_ports)
        
        for container in containers:
            if container.ports:
                for port_info in container.ports.values():
                    if port_info and isinstance(port_info, list):
                        for info in port_info:
                            if 'HostPort' in info:
                                used_ports.add(int(info['HostPort']))
        
        print(f"🔍 Used ports: {sorted(used_ports)}")
        
        if int(requested_host_port) not in used_ports:
            return int(requested_host_port)
        
        port = int(requested_host_port) + 1
        max_attempts = 1000
        attempts = 0
        
        while port in used_ports and attempts < max_attempts:
            port += 1
            attempts += 1
        
        if attempts >= max_attempts:
            raise HTTPException(
                status_code=400,
                detail=f"Could not find available port near {requested_host_port}"
            )
        
        print(f"⚠️  Port {requested_host_port} is in use, using {port} instead")
        return port
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️  Could not check port availability: {str(e)}")
        return int(requested_host_port)

def login_to_registry(client, registry_url, username, password):
    """Login to private Docker registry"""
    try:
        print(f"🔐 Logging in to registry: {registry_url}")
        response = client.login(username=username, password=password, registry=registry_url)
        print(f"✅ Registry login successful")
        return True
    except Exception as e:
        print(f"❌ Registry login failed: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Private registry authentication failed: {str(e)}"
        )

def build_from_github(
    client,
    github_url: str,
    github_branch: str,
    dockerfile_path: str,
    image_name: str,
    github_username: Optional[str] = None,
    github_token: Optional[str] = None
):
    """Clone GitHub repo and build Docker image"""
    try:
        print(f"📦 Building Docker image from GitHub: {github_url}")
        
        # Clean up the URL - remove extra spaces
        github_url = github_url.strip()
        
        # Create temporary directory for cloning
        with tempfile.TemporaryDirectory() as tmpdir:
            print(f"📁 Cloning repository to {tmpdir}")
            
            # Prepare git URL with credentials if provided
            if github_username and github_token:
                # Use token-based authentication
                git_url = github_url.replace("https://", f"https://{github_username}:{github_token}@")
                git_url = git_url.replace("http://", f"http://{github_username}:{github_token}@")
            else:
                git_url = github_url
            
            print(f"🔗 Git URL: {git_url}")
            
            # Clone repository
            clone_result = subprocess.run(
                ["git", "clone", "--branch", github_branch, git_url, tmpdir],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if clone_result.returncode != 0:
                print(f"❌ Git clone failed: {clone_result.stderr}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to clone GitHub repository: {clone_result.stderr}"
                )
            
            print(f"✅ Repository cloned successfully")
            
            # Find Dockerfile
            dockerfile_full_path = os.path.join(tmpdir, dockerfile_path)
            if not os.path.exists(dockerfile_full_path):
                raise HTTPException(
                    status_code=400,
                    detail=f"Dockerfile not found at path: {dockerfile_path}"
                )
            
            print(f"📝 Found Dockerfile at {dockerfile_path}")
            
            # Build Docker image
            print(f"🔨 Building Docker image: {image_name}")
            build_result = client.images.build(
                path=tmpdir,
                dockerfile=dockerfile_path,
                tag=image_name,
                rm=True
            )
            
            print(f"✅ Docker image built successfully: {image_name}")
            return image_name
            
    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=400,
            detail="Git clone timeout - repository too large or network issue"
        )
    except Exception as e:
        print(f"❌ Error building from GitHub: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build image from GitHub: {str(e)}"
        )

@router.post("/deploy", response_model=ContainerResponse)
def deploy_container(
    container_data: ContainerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"\n🚀 Deploy request received for: {container_data.name}")
        docker_client = get_docker_client()
        
        # Determine deployment source
        if container_data.github_url:
            print(f"🐙 GitHub deployment mode: {container_data.github_url}")
            # Build image from GitHub
            image_name = f"{container_data.name}:latest"
            build_from_github(
                docker_client,
                container_data.github_url,
                container_data.github_branch or "main",
                container_data.dockerfile_path or "Dockerfile",
                image_name,
                container_data.github_username,
                container_data.github_token
            )
            final_image = image_name
        else:
            print(f"📦 Docker image deployment mode: {container_data.image}")
            if not container_data.image:
                raise HTTPException(
                    status_code=400,
                    detail="Either 'image' or 'github_url' must be provided"
                )
            
            # Handle private registry login
            if container_data.registry_username and container_data.registry_password:
                login_to_registry(
                    docker_client,
                    container_data.registry_url or "docker.io",
                    container_data.registry_username,
                    container_data.registry_password
                )
            
            # Pull image
            print(f"📦 Checking/pulling image: {container_data.image}")
            try:
                docker_client.images.get(container_data.image)
                print(f"✅ Image {container_data.image} already exists locally")
            except ImageNotFound:
                print(f"⬇️  Pulling image {container_data.image} from registry...")
                try:
                    docker_client.images.pull(container_data.image)
                    print(f"✅ Image {container_data.image} pulled successfully")
                except Exception as pull_error:
                    print(f"❌ Failed to pull image: {str(pull_error)}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to pull image '{container_data.image}'. Check image name and registry credentials."
                    )
            
            final_image = container_data.image
        
        # Parse port mapping
        ports = {}
        actual_ports_str = container_data.ports
        
        if container_data.ports:
            if isinstance(container_data.ports, str):
                port_parts = container_data.ports.split(":")
                if len(port_parts) == 2:
                    container_port = port_parts[0]
                    host_port = port_parts[1]
                    available_port = find_available_port(docker_client, host_port)
                    ports = {f"{container_port}/tcp": int(available_port)}
                    actual_ports_str = f"{container_port}:{available_port}"
                    print(f"🔌 Port mapping: {ports}")
        
        # Create container
        print(f"🏗️  Creating container: {container_data.name}")
        docker_container = docker_client.containers.run(
            final_image,
            name=container_data.name,
            ports=ports if ports else None,
            environment=container_data.environment or {},
            cpu_quota=int(container_data.cpu_limit * 100000) if container_data.cpu_limit else None,
            mem_limit=container_data.memory_limit if container_data.memory_limit else None,
            detach=True,
            restart_policy={"Name": "unless-stopped"}
        )
        
        print(f"✅ Container created: {docker_container.id[:12]}")
        
        # Save to database
        db_container = Container(
            container_id=docker_container.id,
            name=container_data.name,
            image=final_image,
            status="running",
            ports=actual_ports_str,
            environment=container_data.environment,
            cpu_limit=container_data.cpu_limit,
            memory_limit=container_data.memory_limit,
            user_id=current_user.id
        )
        db.add(db_container)
        db.commit()
        db.refresh(db_container)
        
        print(f"💾 Container saved to database: ID={db_container.id}")
        return db_container
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in deploy_container: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to deploy container: {str(e)}")

@router.get("/", response_model=List[ContainerResponse])
def list_containers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"\n📋 List containers request for user: {current_user.username}")
        docker_client = get_docker_client()
        containers = db.query(Container).filter(Container.user_id == current_user.id).all()
        
        print(f"📊 Found {len(containers)} containers in database")
        
        for container in containers:
            try:
                docker_container = docker_client.containers.get(container.container_id)
                container.status = docker_container.status
                print(f"  - {container.name}: {container.status}")
            except Exception as e:
                print(f"  - {container.name}: removed")
                container.status = "removed"
        db.commit()
        
        return containers
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in list_containers: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to list containers: {str(e)}")

@router.get("/{container_id}", response_model=ContainerResponse)
def get_container(
    container_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docker_client = get_docker_client()
    container = db.query(Container).filter(
        Container.id == container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    try:
        docker_container = docker_client.containers.get(container.container_id)
        container.status = docker_container.status
        db.commit()
    except:
        container.status = "removed"
    
    return container

@router.post("/{container_id}/start")
def start_container(
    container_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docker_client = get_docker_client()
    container = db.query(Container).filter(
        Container.id == container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    try:
        docker_container = docker_client.containers.get(container.container_id)
        docker_container.start()
        container.status = "running"
        db.commit()
        return {"message": "Container started", "status": "running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{container_id}/stop")
def stop_container(
    container_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docker_client = get_docker_client()
    container = db.query(Container).filter(
        Container.id == container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    try:
        docker_container = docker_client.containers.get(container.container_id)
        docker_container.stop()
        container.status = "exited"
        db.commit()
        return {"message": "Container stopped", "status": "exited"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{container_id}/restart")
def restart_container(
    container_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docker_client = get_docker_client()
    container = db.query(Container).filter(
        Container.id == container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    try:
        docker_container = docker_client.containers.get(container.container_id)
        docker_container.restart()
        container.status = "running"
        db.commit()
        return {"message": "Container restarted", "status": "running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{container_id}")
def delete_container(
    container_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docker_client = get_docker_client()
    container = db.query(Container).filter(
        Container.id == container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    try:
        docker_container = docker_client.containers.get(container.container_id)
        docker_container.stop()
        docker_container.remove()
        print(f"🗑️  Container {container.name} deleted")
    except:
        pass
    
    db.delete(container)
    db.commit()
    return {"message": "Container deleted"}

@router.get("/{container_id}/metrics", response_model=ContainerMetricResponse)
def get_container_metrics(
    container_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docker_client = get_docker_client()
    container = db.query(Container).filter(
        Container.id == container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    try:
        docker_container = docker_client.containers.get(container.container_id)
        stats = docker_container.stats(stream=False)
        
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                   stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                      stats['precpu_stats']['system_cpu_usage']
        cpu_percent = (cpu_delta / system_delta) * len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100.0
        
        memory_usage = stats['memory_stats']['usage']
        memory_limit = stats['memory_stats']['limit']
        memory_percent = (memory_usage / memory_limit) * 100.0
        
        network_rx = stats['networks']['eth0']['rx_bytes'] if 'eth0' in stats.get('networks', {}) else 0
        network_tx = stats['networks']['eth0']['tx_bytes'] if 'eth0' in stats.get('networks', {}) else 0
        
        metric = ContainerMetric(
            container_id=container.id,
            cpu_usage=cpu_percent,
            memory_usage=memory_percent,
            network_rx=network_rx,
            network_tx=network_tx
        )
        db.add(metric)
        db.commit()
        db.refresh(metric)
        
        return metric
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{container_id}/logs")
def get_container_logs(
    container_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docker_client = get_docker_client()
    container = db.query(Container).filter(
        Container.id == container_id,
        Container.user_id == current_user.id
    ).first()
    
    if not container:
        raise HTTPException(status_code=404, detail="Container not found")
    
    try:
        docker_container = docker_client.containers.get(container.container_id)
        logs = docker_container.logs(tail=100).decode('utf-8')
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
