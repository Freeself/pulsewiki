import { useRef, useEffect } from 'react'

const RAY_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb', '#a855f7', '#d8b4fe', '#7e22ce']
const GRID_SIZE = 120
const GRID_ALPHA = 0.08
const FADE_DISTANCE = 600
const BASE_RAY_LENGTH = 25
const RAY_OPACITY = 0.6
const TAIL_FADE = 1.5
const FLUID_STRENGTH = 0.5
const SMOOTHING_FACTOR = 0.05
const MAX_DELTA_TIME = 0.1

function getGridAngle(x: number, y: number, time: number): number {
  const ix = Math.floor(x / GRID_SIZE)
  const iy = Math.floor(y / GRID_SIZE)
  const baseAngle = (ix * 1.1 + iy * 0.7) * 0.5
  const sinTerms = Math.sin(x * 0.005 + time) + Math.sin(y * 0.005 - time * 0.8) + Math.sin((x + y) * 0.003 + time * 1.2)
  const wave1 = Math.sin(x * 0.01 + time * 0.5) * Math.cos(y * 0.01 + time * 0.3)
  return baseAngle + sinTerms * 0.3 + wave1 * 0.2
}

function getFlowVector(x: number, y: number, time: number) {
  const flowAngle = getGridAngle(x * 0.003, y * 0.003, time * 0.3) + Math.sin(y * 0.01) * 0.3
  return {
    x: Math.cos(flowAngle) * FLUID_STRENGTH,
    y: Math.sin(flowAngle) * FLUID_STRENGTH,
  }
}

export default function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = performance.now()
    let smoothDt = 0.016
    let mouseX = -1000
    let mouseY = -1000
    let isMouseDown = false

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    const handleMouseDown = () => { isMouseDown = true }
    const handleMouseUp = () => { isMouseDown = false }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    function animate() {
      if (!ctx || !canvas) return
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, MAX_DELTA_TIME)
      lastTime = now
      smoothDt = smoothDt * (1 - SMOOTHING_FACTOR) + dt * SMOOTHING_FACTOR

      const time = now / 1000
      const w = canvas.width
      const h = canvas.height

      // Clear with background
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      // Draw grid lines
      ctx.strokeStyle = `rgba(168, 85, 247, ${GRID_ALPHA})`
      ctx.lineWidth = 0.5

      const cols = Math.ceil(w / GRID_SIZE)
      const rows = Math.ceil(h / GRID_SIZE)

      // Mouse flow influence
      const mouseFlow = isMouseDown ? 8 : 1
      const mouseRadius = isMouseDown ? 300 : 200

      for (let cy = 0; cy <= rows; cy++) {
        for (let cx = 0; cx <= cols; cx++) {
          const cellX = cx * GRID_SIZE
          const cellY = cy * GRID_SIZE

          // Grid dot
          ctx.beginPath()
          ctx.arc(cellX, cellY, 1, 0, Math.PI * 2)
          ctx.stroke()

          // Calculate flow with mouse influence
          let flow = getFlowVector(cellX, cellY, time)
          const dx = mouseX - cellX
          const dy = mouseY - cellY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < mouseRadius) {
            const influence = (1 - dist / mouseRadius) * mouseFlow
            flow.x += (dx / dist) * influence * 0.5
            flow.y += (dy / dist) * influence * 0.5
          }

          // Ray direction
          const angle = Math.atan2(flow.y, flow.x)
          const rayLength = BASE_RAY_LENGTH * (1 + Math.sin(time * 2 + cx * 0.5 + cy * 0.3) * 0.3)

          // Distance fade
          const cellCenterDist = Math.sqrt(
            (cellX - w / 2) ** 2 + (cellY - h / 2) ** 2
          )
          const fadeFactor = Math.max(0, 1 - cellCenterDist / FADE_DISTANCE) ** TAIL_FADE

          if (fadeFactor < 0.01) continue

          // Color selection based on cell position
          const colorIdx = (cx * 3 + cy * 7) % RAY_COLORS.length
          const color = RAY_COLORS[colorIdx]
          const alpha = RAY_OPACITY * fadeFactor

          // Draw ray
          const endX = cellX + Math.cos(angle) * rayLength
          const endY = cellY + Math.sin(angle) * rayLength

          // Gradient for the ray
          const grad = ctx.createLinearGradient(cellX, cellY, endX, endY)
          grad.addColorStop(0, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'))
          grad.addColorStop(1, color + '00')

          ctx.strokeStyle = grad
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 6])
          ctx.lineDashOffset = time * 10 + cx * 2 + cy * 3

          ctx.beginPath()
          ctx.moveTo(cellX, cellY)
          ctx.lineTo(endX, endY)
          ctx.stroke()
          ctx.setLineDash([])

          // Ink glow at endpoints when mouse is near
          if (dist < mouseRadius * 0.5) {
            const inkStrength = (1 - dist / (mouseRadius * 0.5)) * (isMouseDown ? 1 : 0.3)
            const glow = ctx.createRadialGradient(endX, endY, 0, endX, endY, 15)
            glow.addColorStop(0, color + Math.floor(inkStrength * 0.4 * 255).toString(16).padStart(2, '0'))
            glow.addColorStop(1, color + '00')
            ctx.fillStyle = glow
            ctx.beginPath()
            ctx.arc(endX, endY, 15, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Mouse glow
      if (mouseX > 0 && mouseY > 0) {
        const glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 250)
        glow.addColorStop(0, 'rgba(168, 85, 247, 0.08)')
        glow.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)')
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(mouseX, mouseY, 250, 0, Math.PI * 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}
