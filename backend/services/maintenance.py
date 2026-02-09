"""
Automated Maintenance Service
Handles scheduled cleanup and integrity checks
"""
import logging
import os
import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Feature flags
CLEANLINESS_AUTORUN = os.environ.get('CLEANLINESS_AUTORUN', 'false').lower() == 'true'
AUTORUN_INTERVAL_HOURS = int(os.environ.get('AUTORUN_INTERVAL_HOURS', '24'))


class AutoMaintenanceService:
    """Background service for automated maintenance tasks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.running = False
        self.task = None
        self.last_run = None
        self.next_run = None
    
    async def run_maintenance_cycle(self):
        """
        Run automated maintenance tasks
        - Archive old data
        - Generate integrity report
        - Log cleanliness status
        """
        logger.info("Starting automated maintenance cycle")
        self.last_run = datetime.now(timezone.utc)
        
        try:
            # Import here to avoid circular dependencies
            from services.integrity import generate_integrity_report, generate_cleanliness_report
            
            # Run integrity check
            integrity_report = await generate_integrity_report(self.db)
            logger.info(f"Integrity check: {integrity_report['overall_status']}")
            
            if integrity_report["issues"]:
                logger.warning(f"Found {len(integrity_report['issues'])} integrity issues")
            
            # Run cleanliness check
            cleanliness_report = await generate_cleanliness_report(self.db)
            logger.info(f"Cleanliness score: {cleanliness_report['cleanliness_score']}/100")
            
            if cleanliness_report["recommendations"]:
                logger.info(f"{len(cleanliness_report['recommendations'])} recommendations generated")
            
            # Auto-archive old data (if any)
            await self._auto_archive_old_data()
            
            logger.info("Maintenance cycle completed successfully")
            
        except Exception as e:
            logger.error(f"Maintenance cycle error: {str(e)}")
    
    async def _auto_archive_old_data(self):
        """Archive data older than 90 days"""
        try:
            now = datetime.now(timezone.utc)
            cutoff_date = (now - timedelta(days=90)).isoformat()
            
            # Archive old bookings
            old_bookings = await self.db.bookings.find(
                {"created_at": {"$lt": cutoff_date}},
                {"_id": 0}
            ).to_list(1000)
            
            for booking in old_bookings:
                booking["archived_at"] = now.isoformat()
                await self.db.archived_bookings.insert_one(booking)
                await self.db.bookings.delete_one({"id": booking["id"]})
            
            if old_bookings:
                logger.info(f"Archived {len(old_bookings)} old bookings")
            
        except Exception as e:
            logger.error(f"Auto-archive error: {str(e)}")
    
    async def maintenance_loop(self):
        """Main loop for automated maintenance"""
        logger.info(f"Automated maintenance service started (interval: {AUTORUN_INTERVAL_HOURS}h)")
        
        while self.running:
            try:
                await self.run_maintenance_cycle()
                
                # Schedule next run
                self.next_run = datetime.now(timezone.utc) + timedelta(hours=AUTORUN_INTERVAL_HOURS)
                logger.info(f"Next maintenance cycle: {self.next_run.isoformat()}")
                
                # Wait for interval
                await asyncio.sleep(AUTORUN_INTERVAL_HOURS * 3600)
                
            except asyncio.CancelledError:
                logger.info("Maintenance service cancelled")
                break
            except Exception as e:
                logger.error(f"Maintenance loop error: {str(e)}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    def start(self):
        """Start the maintenance service"""
        if not CLEANLINESS_AUTORUN:
            logger.info("Automated maintenance disabled (CLEANLINESS_AUTORUN=false)")
            return
        
        if self.running:
            logger.warning("Maintenance service already running")
            return
        
        self.running = True
        self.task = asyncio.create_task(self.maintenance_loop())
        logger.info("Automated maintenance service enabled")
    
    async def stop(self):
        """Stop the maintenance service"""
        if not self.running:
            return
        
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        logger.info("Automated maintenance service stopped")
    
    def get_status(self) -> dict:
        """Get current status of maintenance service"""
        return {
            "enabled": CLEANLINESS_AUTORUN,
            "running": self.running,
            "interval_hours": AUTORUN_INTERVAL_HOURS,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None
        }


# Global maintenance service instance
maintenance_service = None


def get_maintenance_service(db: AsyncIOMotorDatabase) -> AutoMaintenanceService:
    """Get or create maintenance service singleton"""
    global maintenance_service
    if maintenance_service is None:
        maintenance_service = AutoMaintenanceService(db)
    return maintenance_service
