import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { publicHomestayService } from '../services/publicHomestayService'
import { ImageWithFallback } from '../components/figma/ImageWithFallback'
import { Star, Heart } from 'lucide-react'
import type { Homestay } from '../types/homestay.types'

export default function HomestayDetail() {
    const { id } = useParams()
    const [homestay, setHomestay] = useState<Homestay | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)

    const getInitials = (name?: string) => {
        if (!name) return ''
        const parts = name.trim().split(/\s+/)
        if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
        return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
    }

    useEffect(() => {
        if (!id) return
        let mounted = true
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await publicHomestayService.getById(id)
                if (!mounted) return
                setHomestay(res)
                setSelectedIndex(0)
            } catch (err) {
                console.error(err)
                if (!mounted) return
                setError('Không thể tải thông tin homestay')
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [id])

    const images = homestay?.images ?? []

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <Link to="/" className="text-sm text-blue-600 hover:underline">← Quay về</Link>

                {loading && <div className="py-8 text-center">Đang tải...</div>}
                {error && <div className="py-8 text-center text-red-600">{error}</div>}

                {homestay && (
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left / Main: images + details (span 2 columns on lg) */}
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <div className="lg:col-span-2">
                                    <div className="rounded-xl overflow-hidden h-96 bg-gray-100">
                                        <ImageWithFallback
                                            src={images[selectedIndex] ?? ''}
                                            alt={homestay.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="hidden lg:block">
                                    <div className="flex flex-col gap-3">
                                        {Array.from({ length: 4 }).map((_, idx) => {
                                            const img = images[idx + 1] ?? images[(idx + 1) % images.length]
                                            return (
                                                <div key={idx} onClick={() => setSelectedIndex(idx + 1 < images.length ? idx + 1 : 0)} className="h-28 rounded overflow-hidden cursor-pointer border">
                                                    <ImageWithFallback src={img ?? ''} alt={`${homestay.name}-${idx}`} className="w-full h-full object-cover" />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 bg-white rounded-xl p-6 shadow">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h1 className="text-2xl font-bold">{homestay.name}</h1>
                                        <p className="text-sm text-gray-600 mt-1">{homestay.address} • {homestay.city}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 bg-white/90 px-3 py-1 rounded-full shadow">
                                            <Star className="w-4 h-4 text-yellow-400" />
                                            <span className="text-sm font-medium">{homestay.rating ?? '—'}</span>
                                        </div>
                                        <button className="p-2 rounded-full border hover:bg-gray-50"><Heart className="w-5 h-5 text-gray-600" /></button>
                                    </div>
                                </div>

                                {homestay.ownerName && (
                                    <div className="mt-4 flex items-center gap-4 border-t pt-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-700">
                                            {getInitials(homestay.ownerName)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">Owner: {homestay.ownerName}</div>
                                            {/* If backend provides more host info, render here (e.g., host.title, years) */}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <p className="text-gray-700">{homestay.description}</p>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold">Số khách</h4>
                                        <p className="text-sm text-gray-600">{homestay.maxGuests} khách</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">Phòng ngủ</h4>
                                        <p className="text-sm text-gray-600">{homestay.bedrooms ?? 0} phòng</p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h4 className="font-semibold mb-2">Tiện nghi</h4>
                                    {homestay.amenities && homestay.amenities.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {homestay.amenities.map((a, i) => (
                                                <div key={i} className="text-sm bg-gray-100 px-3 py-1 rounded">{a}</div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">Không có thông tin tiện nghi</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: booking card */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 bg-white rounded-xl p-5 shadow">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <div className="text-2xl font-bold">{homestay.pricePerNight?.toLocaleString('vi-VN')}đ cho 1 đêm</div>
                                    </div>
                                    <div className="text-right text-sm text-gray-600">{homestay.rating ?? '—'} ★</div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-sm text-gray-700">Ngày nhận</label>
                                    <input type="date" className="w-full mt-1 p-2 border rounded" />
                                </div>
                                <div className="mt-3">
                                    <label className="text-sm text-gray-700">Ngày trả</label>
                                    <input type="date" className="w-full mt-1 p-2 border rounded" />
                                </div>

                                <div className="mt-4">
                                    <label className="text-sm text-gray-700">Khách</label>
                                    <select className="w-full mt-1 p-2 border rounded">
                                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} khách</option>)}
                                    </select>
                                </div>

                                <button className="w-full mt-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg">Đặt ngay</button>

                                <div className="mt-4 text-xs text-gray-500">Phí dịch vụ và thuế sẽ được tính khi thanh toán.</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
