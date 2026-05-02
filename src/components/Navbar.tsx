import { Link, useLocation } from 'react-router'
import { useState } from 'react'
import {
  Brain,
  BookOpen,
  Share2,
  MessageSquare,
  Settings,
  Menu,
  X
} from 'lucide-react'

export default function Navbar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { path: '/', label: '工作台', icon: Brain },
    { path: '/wiki', label: 'Wiki', icon: BookOpen },
    { path: '/network', label: '知识网络', icon: Share2 },
    { path: '/questions', label: '问答', icon: MessageSquare },
    { path: '/settings', label: '设置', icon: Settings },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl">
      <div className="glass-panel rounded-full px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:block">PulseWiki</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden mt-2 glass-panel rounded-2xl p-3 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                  isActive(item.path)
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
