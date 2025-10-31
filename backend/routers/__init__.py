"""
Routers package for IntelliScaleSim API
Contains all route handlers for the application
"""

from . import auth
from . import containers
from . import load_testing
from . import auto_scaling
from . import billing
from . import analytics

__all__ = [
    'auth',
    'containers',
    'load_testing',
    'auto_scaling',
    'billing',
    'analytics'
]
