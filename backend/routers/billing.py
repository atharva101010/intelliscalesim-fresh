from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict

from database import get_db
from models import User
from schemas import BillingCalculateRequest, BillingResponse, PricingResponse
from auth import get_current_user

router = APIRouter(prefix="/api/billing", tags=["Billing"])

# Cloud provider pricing (per hour)
PRICING = {
    "aws": {
        "name": "Amazon Web Services",
        "compute_per_core": 0.0416,  # t3.medium equivalent
        "memory_per_gb": 0.0052,
        "storage_per_gb": 0.10 / 730,  # EBS gp3 per month / hours
        "currency": "USD"
    },
    "gcp": {
        "name": "Google Cloud Platform",
        "compute_per_core": 0.0475,  # n1-standard-1 equivalent
        "memory_per_gb": 0.0064,
        "storage_per_gb": 0.04 / 730,  # Standard persistent disk
        "currency": "USD"
    },
    "azure": {
        "name": "Microsoft Azure",
        "compute_per_core": 0.052,  # B2s equivalent
        "memory_per_gb": 0.0065,
        "storage_per_gb": 0.05 / 730,  # Standard SSD
        "currency": "USD"
    }
}

@router.get("/pricing", response_model=List[PricingResponse])
def get_all_pricing():
    """Get pricing for all cloud providers"""
    result = []
    for provider, pricing in PRICING.items():
        result.append({
            "provider": provider,
            "compute_per_hour": pricing["compute_per_core"],
            "storage_per_gb": pricing["storage_per_gb"],
            "currency": pricing["currency"]
        })
    return result

@router.get("/pricing/{provider}", response_model=PricingResponse)
def get_provider_pricing(provider: str):
    """Get pricing for a specific cloud provider"""
    if provider not in PRICING:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not found")
    
    pricing = PRICING[provider]
    return {
        "provider": provider,
        "compute_per_hour": pricing["compute_per_core"],
        "storage_per_gb": pricing["storage_per_gb"],
        "currency": pricing["currency"]
    }

@router.post("/calculate", response_model=BillingResponse)
def calculate_cost(
    request: BillingCalculateRequest,
    current_user: User = Depends(get_current_user)
):
    """Calculate estimated cloud costs"""
    if request.provider not in PRICING:
        raise HTTPException(status_code=404, detail=f"Provider {request.provider} not found")
    
    pricing = PRICING[request.provider]
    
    # Calculate compute cost (CPU + Memory)
    compute_cost = (
        (request.cpu_cores * pricing["compute_per_core"]) +
        (request.memory_gb * pricing["memory_per_gb"])
    ) * request.hours
    
    # Calculate storage cost
    storage_cost = request.storage_gb * pricing["storage_per_gb"] * request.hours
    
    # Total cost
    total_cost = compute_cost + storage_cost
    
    return {
        "provider": request.provider,
        "compute_cost": round(compute_cost, 2),
        "storage_cost": round(storage_cost, 2),
        "total_cost": round(total_cost, 2),
        "breakdown": {
            "hours": request.hours,
            "cpu_cores": request.cpu_cores,
            "memory_gb": request.memory_gb,
            "storage_gb": request.storage_gb,
            "compute_rate": pricing["compute_per_core"],
            "storage_rate": pricing["storage_per_gb"]
        }
    }

@router.post("/compare")
def compare_providers(
    request: BillingCalculateRequest,
    current_user: User = Depends(get_current_user)
):
    """Compare costs across all cloud providers"""
    results = {}
    
    for provider in PRICING.keys():
        request.provider = provider
        cost = calculate_cost(request, current_user)
        results[provider] = cost
    
    return {
        "comparison": results,
        "cheapest": min(results, key=lambda x: results[x]["total_cost"]),
        "most_expensive": max(results, key=lambda x: results[x]["total_cost"])
    }
