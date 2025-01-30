import { Button } from "@nextui-org/button"
import { TypeIcon as type, LucideIcon } from 'lucide-react'

interface SidebarButtonProps {
  icon: LucideIcon
  label: string
  isExpanded: boolean
  isMobile: boolean
  onClick: () => void
}

export function SidebarButton({ icon: Icon, label, isExpanded, isMobile, onClick }: SidebarButtonProps) {
  const buttonStyles = "transition-all duration-200 hover:scale-[1.02] active:scale-95 touch-manipulation hover:brightness-110"

  return (
    <Button 
      className={`w-12 h-12 flex items-center justify-center rounded-xl ${buttonStyles} ${
        isExpanded ? 'w-full px-4 justify-start' : ''
      }`}
      onClick={onClick}
    >
      <Icon className="w-6 h-6" />
      {isExpanded && !isMobile && <span className="ml-3">{label}</span>}
    </Button>
  )
}

