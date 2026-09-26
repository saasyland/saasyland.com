import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  Grid3X3,
  HelpCircle,
  ImageIcon,
  Mail,
  Monitor,
  MonitorPlay,
  Pen,
  Save,
  ShieldAlert,
  Smartphone,
  Tablet,
  Tags,
  Trash2,
  UploadCloud,
  UsersRound,
  Video,
} from "lucide-react"

export const LANDING_PAGE_ACTIONS = [
  { icon: Eye, id: "preview", variant: "outline" },
  { icon: Save, id: "saveChanges", variant: "outline" },
  { icon: UploadCloud, id: "publish", variant: "default" },
] as const

export const LANDING_PAGE_SECTIONS = [
  { icon: MonitorPlay, id: "hero" },
  { icon: Grid3X3, id: "features" },
  { icon: Video, id: "video" },
  { icon: UsersRound, id: "testimonials" },
  { icon: Tags, id: "pricing" },
  { icon: ImageIcon, id: "gallery" },
  { icon: HelpCircle, id: "faq" },
  { icon: Mail, id: "contact" },
] as const

export const LANDING_PAGE_VIEWPORTS = [
  { icon: Monitor, id: "desktop" },
  { icon: Tablet, id: "tablet" },
  { icon: Smartphone, id: "mobile" },
] as const

export const LANDING_PAGE_FEATURES = [
  { barWidths: ["w-20", "w-16"], icon: Grid3X3, id: "feature1" },
  { barWidths: ["w-24", "w-12"], icon: ShieldAlert, id: "feature2" },
  { barWidths: ["w-16", "w-20"], icon: UsersRound, id: "feature3" },
] as const

export const LANDING_PAGE_SECTION_ACTIONS = [
  { className: "hover:text-foreground", icon: Pen, id: "edit" },
  { className: "hover:text-foreground", icon: Copy, id: "duplicate" },
  { className: "hover:text-destructive", icon: Trash2, id: "delete" },
] as const

export const LANDING_PAGE_ALIGNMENTS = [
  { icon: AlignLeft, id: "alignLeft" },
  { icon: AlignCenter, id: "alignCenter" },
  { icon: AlignRight, id: "alignRight" },
] as const

export const LANDING_PAGE_PADDINGS = [
  { icon: ArrowUp, id: "paddingTop" },
  { icon: ArrowDown, id: "paddingBot" },
] as const

export const LANDING_PAGE_SURFACES = [
  { className: "bg-background", id: "page" },
  { className: "bg-card", id: "panel" },
  { className: "bg-muted", id: "raised" },
] as const

export const LANDING_PAGE_BUTTONS = [
  { defaultLabelKey: "canvas.getStarted", id: "primaryButton" },
  { defaultLabelKey: "canvas.bookDemo", id: "secondaryButton" },
] as const
