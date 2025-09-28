import React, { useRef, useEffect } from 'react';

interface WordData {
  text: string;
  size: number;
  color: string;
}

interface WordCloudProps {
  words: WordData[];
  width?: number;
  height?: number;
}

const WordCloud: React.FC<WordCloudProps> = ({ words, width = 800, height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !words.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Draw words
    const centerX = width / 2;
    const centerY = height / 2;
    const maxSize = Math.max(...words.map(w => w.size));

    words.forEach((word, index) => {
      const fontSize = Math.max(12, (word.size / maxSize) * 48);
      ctx.font = `${Math.round(fontSize)}px Arial`;
      ctx.fillStyle = word.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Simple positioning - spiral layout
      const angle = (index * 137.5) * (Math.PI / 180); // Golden angle
      const radius = Math.min(50 + index * 8, Math.min(width, height) / 3);
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Ensure words stay within bounds
      const adjustedX = Math.max(fontSize/2, Math.min(width - fontSize/2, x));
      const adjustedY = Math.max(fontSize/2, Math.min(height - fontSize/2, y));

      ctx.fillText(word.text, adjustedX, adjustedY);
    });
  }, [words, width, height]);

  return (
    <div className="flex justify-center">
      <canvas 
        ref={canvasRef} 
        style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%' }}
        className="border border-gray-200 rounded-lg bg-white"
      />
    </div>
  );
};

export default WordCloud;