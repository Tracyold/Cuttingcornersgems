"""
Order Storage Adapter Layer
Provides pluggable storage backends for order data.

Adapters:
- InMemoryOrderStore: Development/testing (default when no DB)
- DbOrderStore: Production MongoDB storage (stub, requires DB)

Factory function selects appropriate adapter based on environment.
"""
import os
import logging
from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime, timezone

from models.order import Order, OrderStatus

logger = logging.getLogger(__name__)


class OrderStoreInterface(ABC):
    """Abstract interface for order storage backends."""
    
    @abstractmethod
    async def list_orders_for_user(self, user_id: str) -> List[Order]:
        """Retrieve all orders for a given user."""
        pass
    
    @abstractmethod
    async def record_order(self, order: Order) -> None:
        """Record/persist a new order."""
        pass
    
    @abstractmethod
    async def get_order(self, order_id: str) -> Optional[Order]:
        """Retrieve a specific order by ID."""
        pass
    
    @abstractmethod
    async def update_order_status(self, order_id: str, status: OrderStatus) -> bool:
        """Update order status. Returns True if updated, False if not found."""
        pass
    
    @abstractmethod
    async def clear_all(self) -> None:
        """Clear all orders (for testing/dev only)."""
        pass


# ==============================================================================
# IN-MEMORY ADAPTER (Development/Testing)
# ==============================================================================

# Module-level storage for in-memory adapter
_in_memory_orders: dict = {}  # order_id -> Order
_user_orders_index: dict = {}  # user_id -> set[order_id]


class InMemoryOrderStore(OrderStoreInterface):
    """
    In-memory order storage for development and testing.
    
    Used automatically when:
    - ENV != "production"
    - Database is not configured
    
    Data persists only for the lifetime of the process.
    """
    
    async def list_orders_for_user(self, user_id: str) -> List[Order]:
        """Retrieve all orders for a user from in-memory storage."""
        order_ids = _user_orders_index.get(user_id, set())
        orders = [_in_memory_orders[oid] for oid in order_ids if oid in _in_memory_orders]
        return sorted(orders, key=lambda o: o.created_at, reverse=True)
    
    async def record_order(self, order: Order) -> None:
        """Store an order in memory."""
        _in_memory_orders[order.order_id] = order
        if order.user_id not in _user_orders_index:
            _user_orders_index[order.user_id] = set()
        _user_orders_index[order.user_id].add(order.order_id)
        logger.debug(f"InMemory: Recorded order {order.order_id} for user {order.user_id}")
    
    async def get_order(self, order_id: str) -> Optional[Order]:
        """Retrieve a specific order by ID."""
        return _in_memory_orders.get(order_id)
    
    async def update_order_status(self, order_id: str, status: OrderStatus) -> bool:
        """Update order status in memory."""
        if order_id in _in_memory_orders:
            order = _in_memory_orders[order_id]
            # Create updated order (Pydantic models are immutable by default)
            updated = Order(
                order_id=order.order_id,
                user_id=order.user_id,
                order_total=order.order_total,
                status=status,
                created_at=order.created_at
            )
            _in_memory_orders[order_id] = updated
            return True
        return False
    
    async def clear_all(self) -> None:
        """Clear all in-memory orders."""
        _in_memory_orders.clear()
        _user_orders_index.clear()
        logger.info("InMemory: Cleared all orders")


# ==============================================================================
# FILE-BACKED ADAPTER (Design/Dev with Persistence)
# ==============================================================================

class FileOrderStore(OrderStoreInterface):
    """
    File-backed order storage for design-stage persistence.
    
    Loads from JSON file at initialization, saves after every mutation.
    """
    
    def __init__(self, base_dir: str = None):
        from config.persistence import PERSISTENCE_DIR, ORDERS_FILE
        from services.persistence.json_store import JsonStore
        
        self._base_dir = base_dir or PERSISTENCE_DIR
        self._store = JsonStore(self._base_dir)
        self._filename = ORDERS_FILE
        self._orders: dict = {}  # order_id -> Order dict
        self._user_index: dict = {}  # user_id -> set[order_id]
        self._load_from_file()
        logger.info(f"FileOrderStore: Initialized with {len(self._orders)} orders")
    
    def _load_from_file(self) -> None:
        """Load orders from JSON file."""
        data = self._store.load(self._filename, default={"orders": [], "version": 1})
        self._orders.clear()
        self._user_index.clear()
        
        for order_dict in data.get("orders", []):
            try:
                order = Order(**order_dict)
                self._orders[order.order_id] = order
                if order.user_id not in self._user_index:
                    self._user_index[order.user_id] = set()
                self._user_index[order.user_id].add(order.order_id)
            except Exception as e:
                logger.warning(f"FileOrderStore: Failed to parse order: {e}")
    
    def _save_to_file(self) -> None:
        """Save all orders to JSON file."""
        orders_list = [o.model_dump() for o in self._orders.values()]
        self._store.save(self._filename, {"orders": orders_list, "version": 1})
    
    async def list_orders_for_user(self, user_id: str) -> List[Order]:
        order_ids = self._user_index.get(user_id, set())
        orders = [self._orders[oid] for oid in order_ids if oid in self._orders]
        return sorted(orders, key=lambda o: o.created_at, reverse=True)
    
    async def record_order(self, order: Order) -> None:
        self._orders[order.order_id] = order
        if order.user_id not in self._user_index:
            self._user_index[order.user_id] = set()
        self._user_index[order.user_id].add(order.order_id)
        self._save_to_file()
        logger.debug(f"FileOrderStore: Recorded order {order.order_id}")
    
    async def get_order(self, order_id: str) -> Optional[Order]:
        return self._orders.get(order_id)
    
    async def update_order_status(self, order_id: str, status: OrderStatus) -> bool:
        if order_id in self._orders:
            order = self._orders[order_id]
            updated = Order(
                order_id=order.order_id,
                user_id=order.user_id,
                order_total=order.order_total,
                status=status,
                created_at=order.created_at
            )
            self._orders[order_id] = updated
            self._save_to_file()
            return True
        return False
    
    async def clear_all(self) -> None:
        self._orders.clear()
        self._user_index.clear()
        self._save_to_file()
        logger.info("FileOrderStore: Cleared all orders")


# ==============================================================================
# DATABASE ADAPTER (Production - STUB)
# ==============================================================================

class DbOrderStore(OrderStoreInterface):
    """
    MongoDB-backed order storage for production.
    
    STUB IMPLEMENTATION - Requires database connection.
    Replace TODO placeholders when wiring to actual database.
    """
    
    def __init__(self, db=None):
        """
        Initialize with database connection.
        
        Args:
            db: Motor async MongoDB database instance
        """
        self.db = db
    
    async def list_orders_for_user(self, user_id: str) -> List[Order]:
        """Retrieve all orders for a user from database."""
        # TODO: Implement when wiring to MongoDB
        # orders_cursor = self.db.orders.find(
        #     {"user_id": user_id},
        #     {"_id": 0}
        # ).sort("created_at", -1)
        # docs = await orders_cursor.to_list(1000)
        # return [Order(**doc) for doc in docs]
        raise NotImplementedError("DbOrderStore requires database connection")
    
    async def record_order(self, order: Order) -> None:
        """Persist an order to database."""
        # TODO: Implement when wiring to MongoDB
        # order_dict = order.model_dump()
        # await self.db.orders.insert_one(order_dict)
        raise NotImplementedError("DbOrderStore requires database connection")
    
    async def get_order(self, order_id: str) -> Optional[Order]:
        """Retrieve a specific order by ID from database."""
        # TODO: Implement when wiring to MongoDB
        # doc = await self.db.orders.find_one({"order_id": order_id}, {"_id": 0})
        # return Order(**doc) if doc else None
        raise NotImplementedError("DbOrderStore requires database connection")
    
    async def update_order_status(self, order_id: str, status: OrderStatus) -> bool:
        """Update order status in database."""
        # TODO: Implement when wiring to MongoDB
        # result = await self.db.orders.update_one(
        #     {"order_id": order_id},
        #     {"$set": {"status": status}}
        # )
        # return result.modified_count > 0
        raise NotImplementedError("DbOrderStore requires database connection")
    
    async def clear_all(self) -> None:
        """Clear all orders (for testing only - disabled in production)."""
        raise NotImplementedError("clear_all is disabled for DbOrderStore")


# ==============================================================================
# FACTORY / ADAPTER SELECTION
# ==============================================================================

# Singleton instance cache
_store_instance: Optional[OrderStoreInterface] = None


def get_order_store(db=None, force_memory: bool = False) -> OrderStoreInterface:
    """
    Factory function to get appropriate order store based on environment.
    
    Selection logic (updated for PERSISTENCE_MODE):
    - force_memory=True: Always return InMemoryOrderStore
    - PERSISTENCE_MODE=FILE: FileOrderStore
    - PERSISTENCE_MODE=MEMORY: InMemoryOrderStore
    - PERSISTENCE_MODE=DB: DbOrderStore
    
    Args:
        db: Optional MongoDB database instance
        force_memory: Force in-memory store regardless of environment
    
    Returns:
        OrderStoreInterface implementation
    """
    global _store_instance
    
    from config.persistence import PERSISTENCE_MODE
    
    if force_memory:
        logger.info("OrderStore: Using InMemoryOrderStore (forced)")
        return InMemoryOrderStore()
    
    if PERSISTENCE_MODE == "FILE":
        if _store_instance is None or not isinstance(_store_instance, FileOrderStore):
            _store_instance = FileOrderStore()
            logger.info("OrderStore: Using FileOrderStore (FILE mode)")
        return _store_instance
    
    elif PERSISTENCE_MODE == "MEMORY":
        if _store_instance is None or not isinstance(_store_instance, InMemoryOrderStore):
            _store_instance = InMemoryOrderStore()
            logger.info("OrderStore: Using InMemoryOrderStore (MEMORY mode)")
        return _store_instance
    
    else:  # DB mode
        if db is None:
            if _store_instance is None or not isinstance(_store_instance, FileOrderStore):
                _store_instance = FileOrderStore()
                logger.warning("OrderStore: DB mode but no db, falling back to FileOrderStore")
            return _store_instance
        
        if _store_instance is None or not isinstance(_store_instance, DbOrderStore):
            _store_instance = DbOrderStore(db)
            logger.info("OrderStore: Using DbOrderStore (DB mode)")
        return _store_instance


def reset_store_instance() -> None:
    """Reset the singleton store instance (for testing)."""
    global _store_instance
    _store_instance = None
