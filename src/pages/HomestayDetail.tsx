import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, Heart, ArrowLeft, CalendarDays, Users, Phone, MessageSquareText } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import { publicHomestayService } from '../services/publicHomestayService'
import { ImageWithFallback } from '../components/figma/ImageWithFallback'
import type { Homestay } from '../types/homestay.types'
import { bookingService } from '../services/bookingService'
import { authService } from '../services/authService'
import PaymentModal from './customer/PaymentModal'
import toast from 'react-hot-toast'
import { apiService } from '../services/apiService'
import { apiConfig } from '../config/apiConfig'
import type { Review } from '../services/reviewService'

export default function HomestayDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [homestay, setHomestay] = useState<Homestay | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [guests, setGuests] = useState(1)
    const [contactPhone, setContactPhone] = useState('')
    const [specialRequests, setSpecialRequests] = useState('')
    const [isCalculating, setIsCalculating] = useState(false)
    const [calcResult, setCalcResult] = useState<number | null>(null)
    const [pendingBooking, setPendingBooking] = useState<{
        id: string; homestayName: string; checkIn: string; checkOut: string;
        totalNights: number; guestsCount: number; pricePerNight: number; totalPrice: number;
    } | null>(null)
    const [isBooking, setIsBooking] = useState(false)
    const [reviews, setReviews] = useState<Review[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)

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

    // Ensure guests does not exceed homestay max when homestay loads/changes
    useEffect(() => {
        if (!homestay) return
        const max = homestay.maxGuests ?? 1
        setGuests((g) => Math.min(g, Math.max(1, max)))
    }, [homestay])

    // Fetch public reviews
    useEffect(() => {
        if (!id) return
        let mounted = true
        const load = async () => {
            setReviewsLoading(true)
            try {
                const res = await apiService.get<any>(apiConfig.endpoints.publicHomestays.reviews(id))
                if (!mounted) return
                const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
                setReviews(list.map((r: any) => ({
                    id: r.id,
                    bookingId: r.bookingId ?? '',
                    homestayId: r.homestayId ?? id,
                    homestayName: r.homestayName ?? '',
                    customerName: r.customerName ?? 'Khách',
                    rating: r.rating ?? 0,
                    cleanlinessRating: r.cleanlinessRating ?? 0,
                    locationRating: r.locationRating ?? 0,
                    valueRating: r.valueRating ?? 0,
                    communicationRating: r.communicationRating ?? 0,
                    comment: r.comment ?? '',
                    replyFromOwner: r.replyFromOwner ?? undefined,
                    replyAt: r.replyAt ?? undefined,
                    isVerified: r.isVerified ?? undefined,
                    createdAt: r.createdAt ?? '',
                })))
            } catch {
                if (mounted) setReviews([])
            } finally {
                if (mounted) setReviewsLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [id])

    const images = homestay?.images ?? []

    const nights = useMemo(() => {
        if (!checkIn || !checkOut) return 0
        const start = new Date(checkIn)
        const end = new Date(checkOut)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        return diff > 0 ? diff : 0
    }, [checkIn, checkOut])

    useEffect(() => {
        let alive = true
        const run = async () => {
            setCalcResult(null)
            if (!homestay?.id) return
            if (!checkIn || !checkOut) return
            if (nights <= 0) return
            // BE booking endpoints yêu cầu authenticated → chỉ calculate khi user đã login
            if (!authService.isAuthenticated()) return
            setIsCalculating(true)
            try {
                const res = await bookingService.calculate({
                    homestayId: homestay.id,
                    checkIn,
                    checkOut,
                    guestsCount: guests,
                })
                if (!alive) return
                setCalcResult(res)
            } catch (e) {
                console.error(e)
                if (!alive) return
                setCalcResult(null)
            } finally {
                if (alive) setIsCalculating(false)
            }
        }
        run()
        return () => { alive = false }
    }, [homestay?.id, checkIn, checkOut, guests, nights, specialRequests, contactPhone])

    const avgRating = useMemo(() => {
        if (reviews.length === 0) return null
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
        return Math.round((sum / reviews.length) * 10) / 10
    }, [reviews])

    const formatMoney = (value: any) => {
        const n = typeof value === 'number' ? value : Number(value)
        if (!Number.isFinite(n)) return '—'
        return `${n.toLocaleString('vi-VN')}đ`
    }

    const isPastDate = (d: string) => {
        if (!d) return false
        const dt = new Date(d)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        dt.setHours(0, 0, 0, 0)
        return dt < today
    }

    const computedTotal = useMemo(() => {
        // BE calculate trả về số decimal trực tiếp
        if (typeof calcResult === 'number' && Number.isFinite(calcResult)) return calcResult
        // fallback: homestay price * nights
        const price = homestay?.pricePerNight
        if (typeof price === 'number' && nights > 0) return price * nights
        return undefined
    }, [calcResult, homestay, nights])

    return (
        <>
        <MainLayout>
            <div className="max-w-[1600px] mx-auto px-4 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Quay về</span>
                </button>

                {loading && <div className="py-8 text-center">Đang tải...</div>}
                {error && <div className="py-8 text-center text-red-600">{error}</div>}

                {homestay && (
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left / Main: images + details (span 2 columns on lg) */}
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <div className="lg:col-span-2">
                                    <div className="rounded-xl overflow-hidden h-96 bg-gray-100 cursor-pointer" onClick={() => setLightboxSrc(images[selectedIndex] ?? '')}>
                                        <ImageWithFallback
                                            src={images[selectedIndex] ?? ''}
                                            alt={homestay.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="hidden lg:block h-96">
                                    <div className="flex flex-col justify-between h-full">
                                        {Array.from({ length: 4 }).map((_, idx) => {
                                            const img = images[idx + 1] ?? images[(idx + 1) % images.length]
                                            return (
                                                <div key={idx} onClick={() => setLightboxSrc(img ?? '')} className="h-24 rounded overflow-hidden cursor-pointer border">
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
                                        <p className="text-sm text-gray-600 mt-1">
                                            {homestay.address}
                                            {homestay.districtName ? `, ${homestay.districtName}` : ''}
                                            {homestay.provinceName ? `, ${homestay.provinceName}` : ''}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {avgRating !== null && (
                                            <div className="flex items-center gap-1 bg-white/90 px-3 py-1 rounded-full shadow">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                <span className="text-sm font-medium">{avgRating}</span>
                                                <span className="text-xs text-gray-500">({reviews.length})</span>
                                            </div>
                                        )}
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

                            {/* Reviews Section */}
                            <div className="mt-6 bg-white rounded-xl p-6 shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold">Đánh giá</h3>
                                    {avgRating !== null && (
                                        <div className="flex items-center gap-2">
                                            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                            <span className="text-xl font-bold">{avgRating}</span>
                                            <span className="text-sm text-gray-500">({reviews.length} đánh giá)</span>
                                        </div>
                                    )}
                                </div>

                {/* Sub-category averages — chỉ hiện khi có data */}
                                {reviews.length > 0 && (() => {
                                    const hasSubRatings = reviews.some(r =>
                                        r.cleanlinessRating > 0 || r.locationRating > 0 ||
                                        r.valueRating > 0 || r.communicationRating > 0
                                    );
                                    if (!hasSubRatings) return null;
                                    const avg = (key: keyof typeof reviews[0]) =>
                                        Math.round(reviews.reduce((s, r) => s + (r[key] as number), 0) / reviews.length * 10) / 10
                                    const cats = [
                                        { label: 'Vệ sinh', val: avg('cleanlinessRating') },
                                        { label: 'Vị trí', val: avg('locationRating') },
                                        { label: 'Giá trị', val: avg('valueRating') },
                                        { label: 'Giao tiếp', val: avg('communicationRating') },
                                    ]
                                    return (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                                            {cats.map(c => (
                                                <div key={c.label} className="text-center">
                                                    <div className="text-lg font-bold text-gray-800">{c.val}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
                                                    <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(c.val / 5) * 100}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })()}

                                {reviewsLoading && (
                                    <div className="py-6 text-center text-gray-500 text-sm">Đang tải đánh giá...</div>
                                )}

                                {!reviewsLoading && reviews.length === 0 && (
                                    <div className="py-6 text-center text-gray-400 text-sm">Chưa có đánh giá nào cho homestay này.</div>
                                )}

                                {!reviewsLoading && reviews.length > 0 && (
                                    <div className="space-y-5">
                                        {reviews.map(r => (
                                            <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                                        {getInitials(r.customerName)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-medium text-sm">{r.customerName}</span>
                                                            <span className="text-xs text-gray-400 flex-shrink-0">
                                                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-0.5 mt-0.5">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                                                            ))}
                                                        </div>
                                                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">{r.comment}</p>
                                                        {r.replyFromOwner && (
                                                            <div className="mt-3 bg-gray-50 border-l-4 border-cyan-400 rounded-r-lg p-3">
                                                                <div className="text-xs font-semibold text-cyan-700 mb-1">Phản hồi từ chủ nhà</div>
                                                                <p className="text-sm text-gray-600">{r.replyFromOwner}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: booking card */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 bg-white rounded-2xl p-5 shadow border border-gray-100">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <div className="text-2xl font-bold">{homestay.pricePerNight?.toLocaleString('vi-VN')}đ <span className="text-sm font-medium text-gray-600">/ đêm</span></div>
                                    </div>
                                    <div className="text-right text-sm text-gray-600">
                                        {avgRating !== null ? `${avgRating} ★` : ''}
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-gray-500" />
                                            Ngày nhận
                                        </label>
                                        <input value={checkIn} onChange={(e) => setCheckIn(e.target.value)} type="date" min={new Date().toISOString().slice(0, 10)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-gray-500" />
                                            Ngày trả
                                        </label>
                                        <input value={checkOut} onChange={(e) => setCheckOut(e.target.value)} type="date" min={checkIn || new Date().toISOString().slice(0, 10)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-500" />
                                        Số khách
                                    </label>
                                    <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent">
                                        {Array.from({ length: Math.max(1, Math.min(20, homestay.maxGuests || 6)) }).map((_, idx) => {
                                            const n = idx + 1
                                            return <option key={n} value={n}>{n} khách</option>
                                        })}
                                    </select>
                                </div>

                                <div className="mt-4">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-500" />
                                        Số điện thoại liên hệ (tuỳ chọn)
                                    </label>
                                    <input
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="VD: 090xxxxxxx"
                                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <MessageSquareText className="w-4 h-4 text-gray-500" />
                                        Yêu cầu đặc biệt (tuỳ chọn)
                                    </label>
                                    <textarea
                                        value={specialRequests}
                                        onChange={(e) => setSpecialRequests(e.target.value)}
                                        rows={3}
                                        placeholder="Ví dụ: nhận phòng sớm, thêm gối, ..."
                                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                    <div className="flex items-center justify-between text-sm text-gray-700">
                                        <span>{nights > 0 ? `${homestay.pricePerNight?.toLocaleString('vi-VN')}đ × ${nights} đêm` : 'Chọn ngày để tính giá'}</span>
                                        <span className="font-medium">
                                            {nights > 0 && homestay.pricePerNight ? formatMoney(homestay.pricePerNight * nights) : '—'}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm text-gray-700">
                                        <span>Khách</span>
                                        <span className="font-medium">{guests}</span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-900">Tổng (ước tính)</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            {computedTotal !== undefined ? formatMoney(computedTotal) : (isCalculating ? 'Đang tính...' : '—')}
                                        </span>
                                    </div>
                                    {calcResult !== null && (
                                        <div className="mt-2 text-xs text-green-600">
                                            ✓ Giá đã được tính chính xác từ hệ thống
                                        </div>
                                    )}
                                </div>

                                <button onClick={async () => {
                                    if (!authService.isAuthenticated() || !authService.isTokenValid()) {
                                        if (authService.isAuthenticated() && !authService.isTokenValid()) {
                                            toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
                                        }
                                        navigate('/auth/login')
                                        return
                                    }

                                    if (!checkIn || !checkOut) {
                                        toast.error('Vui lòng chọn ngày nhận và trả phòng');
                                        return
                                    }
                                    if (isPastDate(checkIn) || isPastDate(checkOut)) {
                                        toast.error('Không được chọn ngày trong quá khứ');
                                        return
                                    }
                                    if (nights <= 0) {
                                        toast.error('Ngày trả phải sau ngày nhận');
                                        return
                                    }

                                    setIsBooking(true)
                                    try {
                                        const payload = {
                                            homestayId: homestay?.id,
                                            checkIn: checkIn,
                                            checkOut: checkOut,
                                            guestsCount: guests,
                                            ...(specialRequests ? { specialRequests } : {}),
                                            ...(contactPhone ? { contactPhone } : {}),
                                        } as any

                                        const res = await bookingService.createBooking(payload)
                                        if (res && res.success && res.data?.id) {
                                            const bookingData = res.data
                                            const totalPrice = bookingData.totalPrice ?? computedTotal ?? (homestay!.pricePerNight * nights)
                                            setPendingBooking({
                                                id: bookingData.id,
                                                homestayName: homestay!.name,
                                                checkIn,
                                                checkOut,
                                                totalNights: nights,
                                                guestsCount: guests,
                                                pricePerNight: homestay!.pricePerNight,
                                                totalPrice,
                                            })
                                        } else if (res && !res.success) {
                                            toast.error(res.message || 'Đặt phòng thất bại')
                                        } else {
                                            toast.error('Không lấy được thông tin booking, vui lòng thử lại')
                                        }
                                    } catch (err: any) {
                                        console.error(err)
                                        toast.error(err?.message || 'Đã xảy ra lỗi khi đặt phòng')
                                    } finally {
                                        setIsBooking(false)
                                    }
                                }} disabled={isCalculating || isBooking || !checkIn || !checkOut || nights <= 0} className={`w-full mt-5 py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${isCalculating || isBooking || !checkIn || !checkOut || nights <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'}`}>
                                    {isBooking ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Đang xử lý...
                                        </>
                                    ) : isCalculating ? 'Đang tính giá...' : 'Xác nhận đặt phòng'}
                                </button>

                                <div className="mt-4 text-xs text-gray-500">Phí dịch vụ và thuế sẽ được tính khi thanh toán.</div>
                            </div>
                        </div>
                    </div>
                )}
                {lightboxSrc && (
                    <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
                        <img src={lightboxSrc} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()} />
                        <button className="absolute top-6 right-6 text-white text-2xl" onClick={() => setLightboxSrc(null)}>×</button>
                    </div>
                )}
            </div>
        </MainLayout>
        {pendingBooking && (
            <PaymentModal
                booking={pendingBooking}
                onClose={() => { setPendingBooking(null); navigate('/customer/bookings'); }}
                onBack={() => setPendingBooking(null)}
            />
        )}
        </>
    )
}
