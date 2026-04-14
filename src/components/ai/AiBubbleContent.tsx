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
    const amenities = homestay.amenities || homestay.Amenities || '';
    const thumbnail = homestay.thumbnailUrl || homestay.ThumbnailUrl || '';

    const handleBookClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/homestays/${id}`);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-150 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => navigate(`/homestays/${id}`)}>
            {/* Image */}
            <div className="relative h-40 w-full overflow-hidden bg-gray-200">
                <ImageWithFallback
                    src={thumbnail}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-3">
                {/* Name */}
                <h5 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">{name}</h5>

                {/* Location */}
                <div className="flex items-start gap-2 text-xs text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                    <span className="line-clamp-2 leading-tight">{address}</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">
                        {price.toLocaleString('vi-VN')}₫
                    </span>
                    <span className="text-xs text-gray-500">/đêm</span>
                </div>

                {/* Amenities */}
                {amenities && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-2.5 border border-orange-100">
                        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                            🏠 {amenities}
                        </p>
                    </div>
                )}

                {/* Book button */}
                <button
                    onClick={handleBookClick}
                    className="w-full mt-auto px-3 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold rounded-full hover:from-blue-600 hover:to-cyan-600 active:scale-95 transition-all shadow-md hover:shadow-lg"
                >
                    Xem & Đặt
                </button>
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
                    <p className="text-xs font-semibold text-gray-700 mb-2">🏠 Gợi ý cho bạn:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {recommendedHomestays!.map((homestay, idx) => (
                            <HomestayCard key={idx} homestay={homestay} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
