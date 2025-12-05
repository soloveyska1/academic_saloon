import React, { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface TiltCardProps {
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
    glareColor?: string
    tiltMaxAngle?: number
    scaleOnHover?: number
}

export function TiltCard({
    children,
    className,
    style,
    glareColor = 'rgba(255, 255, 255, 0.4)',
    tiltMaxAngle = 5, // Subtle tilt for premium feel
    scaleOnHover = 1.02,
}: TiltCardProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    const x = useMotionValue(0)
    const y = useMotionValue(0)

    // Smooth spring physics for the tilt
    const mouseX = useSpring(x, { stiffness: 300, damping: 30 })
    const mouseY = useSpring(y, { stiffness: 300, damping: 30 })

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [tiltMaxAngle, -tiltMaxAngle])
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-tiltMaxAngle, tiltMaxAngle])

    // Glare position moves opposite to tilt
    // Glare position moves opposite to tilt


    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return

        const rect = ref.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        const mouseXRel = e.clientX - rect.left
        const mouseYRel = e.clientY - rect.top

        // Normalize to -0.5 to 0.5
        const xPct = (mouseXRel / width) - 0.5
        const yPct = (mouseYRel / height) - 0.5

        x.set(xPct)
        y.set(yPct)
    }

    const handleMouseLeave = () => {
        setIsHovered(false)
        x.set(0)
        y.set(0)
    }

    const handleMouseEnter = () => {
        setIsHovered(true)
    }

    // Touch handling for mobile "press" tilt
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!ref.current) return
        // Prevent scrolling if needed, but usually we want scroll. 
        // For cards, maybe just simple press effect is enough, but let's try to calculate tilt from touch
        // Simplification: just tilt towards the touch point relative to center
        const rect = ref.current.getBoundingClientRect()
        const touch = e.touches[0]
        const width = rect.width
        const height = rect.height

        const touchXRel = touch.clientX - rect.left
        const touchYRel = touch.clientY - rect.top

        const xPct = (touchXRel / width) - 0.5
        const yPct = (touchYRel / height) - 0.5

        x.set(xPct)
        y.set(yPct)
    }

    return (
        <motion.div
            ref={ref}
            className={className}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseEnter}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
            style={{
                perspective: 1000,
                transformStyle: 'preserve-3d',
                ...style,
            }}
            whileHover={{ scale: scaleOnHover }}
            whileTap={{ scale: 0.98 }}
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d',
                    width: '100%',
                    height: '100%',
                    borderRadius: 'inherit', // Inherit from parent
                }}
            >
                {children}

                {/* Glare Effect */}
                <motion.div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        background: `radial-gradient(circle at center, ${glareColor}, transparent 70%)`,
                        opacity: isHovered ? 0.3 : 0, // Only show glare on interaction
                        mixBlendMode: 'overlay',
                        pointerEvents: 'none',
                        zIndex: 10,
                        x: useTransform(mouseX, [-0.5, 0.5], [-20, 20]), // Parallax glare
                        y: useTransform(mouseY, [-0.5, 0.5], [-20, 20]),
                    }}
                    animate={{ opacity: isHovered ? 0.4 : 0 }}
                    transition={{ duration: 0.2 }}
                />

                {/* Specular Highlight (The "Sheen") */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 'inherit',
                        background: 'linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.1) 45%, transparent 60%)',
                        backgroundSize: '200% 200%',
                        opacity: 0.5,
                        pointerEvents: 'none',
                        mixBlendMode: 'soft-light',
                    }}
                />
            </motion.div>
        </motion.div>
    )
}
