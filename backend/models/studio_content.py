"""
Studio Page Content Data Contract
Data-driven content model for the Studio page CMS
"""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid


class BeforeAfterImage(BaseModel):
    """Single image in before/after comparison"""
    image_url: str
    alt: str = ""


class BeforeAfterLabels(BaseModel):
    """Labels for before/after slider"""
    before_label: str = "Before"
    after_label: str = "After"


class BeforeAfterContent(BaseModel):
    """Before/After comparison section"""
    before: BeforeAfterImage
    after: BeforeAfterImage
    labels: BeforeAfterLabels = BeforeAfterLabels()


class HeroContent(BaseModel):
    """Studio hero section"""
    title: str = "The Studio"
    subtitle: str = "Where precision meets artistry"


class TimelineItem(BaseModel):
    """Single item in story timeline"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    year: str
    heading: str
    body: str
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    order: int = 0


class EquipmentItem(BaseModel):
    """Single equipment entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    purpose: str
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    order: int = 0


class ActionPhoto(BaseModel):
    """Single action/in-progress photo"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_url: str
    alt: str = ""
    order: int = 0


class CTAContent(BaseModel):
    """Call-to-action section"""
    text: str = "Ready to transform your gem?"
    primary_label: str = "Book a Consultation"
    primary_href: str = "/book"
    secondary_label: str = "View Gallery"
    secondary_href: str = "/gallery"


class StudioContent(BaseModel):
    """
    Complete Studio page content model.
    All content is editable via admin UI.
    """
    # Page visibility toggle
    enabled: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1
    
    # Content sections
    hero: HeroContent = HeroContent()
    before_after: BeforeAfterContent = BeforeAfterContent(
        before=BeforeAfterImage(
            image_url="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
            alt="Rough gemstone before cutting"
        ),
        after=BeforeAfterImage(
            image_url="https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=800",
            alt="Polished gemstone after cutting"
        ),
        labels=BeforeAfterLabels()
    )
    story_timeline: List[TimelineItem] = []
    equipment: List[EquipmentItem] = []
    action_photos: List[ActionPhoto] = []
    cta: CTAContent = CTAContent()


def get_default_studio_content() -> StudioContent:
    """
    Returns default Studio page content.
    Used to initialize the page before any admin edits.
    """
    return StudioContent(
        enabled=True,
        hero=HeroContent(
            title="The Studio",
            subtitle="Where rough stones are transformed into brilliant gems through precision craftsmanship"
        ),
        before_after=BeforeAfterContent(
            before=BeforeAfterImage(
                image_url="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
                alt="Rough gemstone before cutting"
            ),
            after=BeforeAfterImage(
                image_url="https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=800",
                alt="Polished gemstone after cutting"
            ),
            labels=BeforeAfterLabels(
                before_label="Before",
                after_label="After"
            )
        ),
        story_timeline=[
            TimelineItem(
                year="2018",
                heading="The Beginning",
                body="Started with a single faceting machine and a passion for precision. What began as a hobby quickly evolved into a dedication to the craft.",
                image_url="https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600",
                image_alt="Early workshop setup",
                order=0
            ),
            TimelineItem(
                year="2020",
                heading="Growing the Craft",
                body="Expanded the workshop with professional-grade equipment. Began taking on custom cutting projects for collectors and jewelers worldwide.",
                image_url="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600",
                image_alt="Expanded workshop",
                order=1
            ),
            TimelineItem(
                year="2024",
                heading="Today",
                body="A fully equipped studio dedicated to precision gem cutting, restoration, and custom designs. Every stone tells a story, and we help bring that story to light.",
                image_url="https://images.unsplash.com/photo-1583937443566-6b5e69827c9d?w=600",
                image_alt="Modern studio",
                order=2
            )
        ],
        equipment=[
            EquipmentItem(
                name="Ultra-Tec V5",
                purpose="Precision faceting machine for cutting complex designs with micron-level accuracy",
                image_url="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400",
                image_alt="Faceting machine",
                order=0
            ),
            EquipmentItem(
                name="Polariscope",
                purpose="Optical instrument for identifying gem materials and detecting strain patterns",
                image_url="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400",
                image_alt="Polariscope",
                order=1
            ),
            EquipmentItem(
                name="Diamond Laps",
                purpose="Various grit diamond-charged laps for cutting and polishing different materials",
                image_url="https://images.unsplash.com/photo-1615655406736-b37c4fabf923?w=400",
                image_alt="Diamond cutting tools",
                order=2
            )
        ],
        action_photos=[
            ActionPhoto(
                image_url="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600",
                alt="Examining a rough stone",
                order=0
            ),
            ActionPhoto(
                image_url="https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600",
                alt="Cutting a sapphire",
                order=1
            ),
            ActionPhoto(
                image_url="https://images.unsplash.com/photo-1583937443566-6b5e69827c9d?w=600",
                alt="Final polish",
                order=2
            )
        ],
        cta=CTAContent(
            text="Ready to transform your gem? Let's discuss your project.",
            primary_label="Book a Consultation",
            primary_href="/book",
            secondary_label="View Gallery",
            secondary_href="/gallery"
        )
    )


class StudioContentUpdate(BaseModel):
    """Schema for updating studio content via API"""
    enabled: Optional[bool] = None
    hero: Optional[HeroContent] = None
    before_after: Optional[BeforeAfterContent] = None
    story_timeline: Optional[List[TimelineItem]] = None
    equipment: Optional[List[EquipmentItem]] = None
    action_photos: Optional[List[ActionPhoto]] = None
    cta: Optional[CTAContent] = None
