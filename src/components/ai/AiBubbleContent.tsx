import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface RecommendedHomestay {
    id?: string;
    Id?: string;
    name?: string;
    Name?: string;
    address?: string;
    Address?: string;
    price?: number;
    Price?: number;
    description?: string;
    Description?: string;
    amenities?: string;
    Amenities?: string;
    thumbnailUrl?: string;
    ThumbnailUrl?: string;
}

interface AiBubbleContentProps {
    message: string;
    recommendedHomestays?: RecommendedHomestay[];
    isRecommendation?: boolean;
}

/**
 * Format message into bullet points
 * Smart detection of sentence boundaries to create nice bullet points
 */
function formatMessage(text: string): string[] {
    // First, trim whitespace
    text = text.trim();

    // If text already contains bullet formatting, use it
    if (text.includes('●') || text.includes('•')) {
        return text
            .split(/[●•]/)
            .map(line => line.replace(/^[-\s]+/, '').trim())
            .filter(line => line.length > 0);
    }

    // If text contains explicit line breaks with dashes
    if (text.includes('\n-') || text.includes('\n•')) {
        return text
            .split('\n')
            .map(line => line.replace(/^[-•\s]+/, '').trim())
            .filter(line => line.length > 0);
    }

    // If text contains numbered format
    if (/^\d+\./.test(text)) {
        return text
            .split(/\n\d+\./)
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0);
    }

    // If short text (< 150 chars), keep as is
    if (text.length < 150) {
        return [text];
    }

    // Try splitting on Vietnamese sentence patterns
    // Look for period/! /? followed by space and capital letter
    const sentences = text
        .split(/(?<=[.!?])\s+(?=[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])/g)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // If we got multiple sentences, use them
    if (sentences.length > 1) {
        return sentences;
    }

    // Vietnamese often uses commas as sentence separators
    // Split on commas if text is long and we didn't get multiple sentences
    if (text.length > 200) {
        const parts = text
            .split(/[,;]/)
            .map(p => p.trim())
            .filter(p => p.length > 15); // Only keep parts longer than 15 chars

        if (parts.length > 1) {
            return parts;
        }
    }

    // Last resort: return as single bullet
    return [text];
}

function HomestayCard({ homestay }: { homestay: RecommendedHomestay }) {
    const navigate = useNavigate();

    const id = homestay.id || homestay.Id || '';
    const name = homestay.name || homestay.Name || 'Homestay';
    const address = homestay.address || homestay.Address || 'Đang cập nhật';
    const price = homestay.price || homestay.Price || 0;
    const thumbnail = homestay.thumbnailUrl || homestay.ThumbnailUrl || '';

    return (
        <div
            className="flex gap-3 bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-100 transition-all duration-200 cursor-pointer group p-2.5"
            onClick={() => navigate(`/homestays/${id}`)}
        >
            {/* Thumbnail */}
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <ImageWithFallback
                    src={thumbnail}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center flex-1 min-w-0 gap-1.5">
                <h5 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug">{name}</h5>
                <div className="flex items-center gap-1 text-gray-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs text-gray-500 truncate">{address}</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                        {price.toLocaleString('vi-VN')}₫
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">/đêm</span>
                </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex items-center flex-shrink-0 self-center">
                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    );
}

export default function AiBubbleContent({
    message,
    recommendedHomestays,
}: AiBubbleContentProps) {
    const lines = formatMessage(message);
    const hasHomestays = Boolean(recommendedHomestays?.length);

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Message content — formatted as bullets or text */}
            <div className="space-y-2">
                {lines.map((line, idx) => {
                    // Remove bullet or number prefix if present
                    const cleanLine = line
                        .replace(/^[-•\d.]\s*/, '')
                        .trim();

                    if (!cleanLine) return null;

                    return (
                        <div
                            key={idx}
                            className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed"
                        >
                            {/* Bullet point */}
                            {lines.length > 1 && (
                                <span className="text-blue-500 font-bold flex-shrink-0 mt-0.5">●</span>
                            )}
                            <span className="break-words">{cleanLine}</span>
                        </div>
                    );
                })}
            </div>

            {/* Recommended homestays as cards — chỉ hiện nếu có */}
            {hasHomestays && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                        <span className="text-base">🏠</span>
                        <span>Gợi ý cho bạn</span>
                    </p>
                    <div className="flex flex-col gap-2">
                        {recommendedHomestays!.map((homestay, idx) => (
                            <HomestayCard key={idx} homestay={homestay} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
