import { useEffect, useRef } from 'react';

export default function CrashChart({ multiplier, isRunning, isCrashed }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match its CSS size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (multiplier <= 1) return; // Don't draw if we haven't started

    // The math to map the multiplier to X and Y coordinates
    // We cap the visual progress at 10x so the line doesn't go out of bounds
    const progress = Math.min((multiplier - 1) / 10, 1); 
    const startX = 50;
    const startY = canvas.height - 50;
    const endX = startX + progress * (canvas.width - 150);
    const endY = startY - Math.pow(progress, 1.5) * (canvas.height - 150);

    // Calculate the angle of the line to point the arrow correctly
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);

    // Draw the curved line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // Draw a curve (Quadratic Bezier) to the current rocket position
    const controlX = startX + (endX - startX) * 0.5;
    const controlY = startY; 
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);

    // Style the line
    ctx.strokeStyle = isCrashed ? '#ef4444' : '#22c55e'; 
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    // Add a glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = isCrashed ? '#ef4444' : '#22c55e';
    
    ctx.stroke();

    // Draw the line fill (a subtle gradient under the curve)
    ctx.lineTo(endX, startY);
    ctx.lineTo(startX, startY);
    ctx.fillStyle = isCrashed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';
    ctx.fill();

    // --- DRAW THE ARROW HEAD / BIRD ---
    if (!isCrashed) {
      ctx.save();
      ctx.translate(endX, endY);
      ctx.rotate(angle);

      // Draw a glowing arrow head pointing right
      ctx.beginPath();
      ctx.moveTo(10, 0);   // Tip
      ctx.lineTo(-10, 10); // Bottom wing
      ctx.lineTo(-5, 0);   // Middle indent
      ctx.lineTo(-10, -10); // Top wing
      ctx.closePath();

      ctx.fillStyle = '#22c55e';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#22c55e';
      ctx.fill();
      ctx.restore();
    }
  }, [multiplier, isRunning, isCrashed]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full z-0 pointer-events-none"
    />
  );
}