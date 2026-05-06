import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, Heart, ArrowLeft, CalendarDays, Users, Phone, MessageSquareText, MapPin, ExternalLink, Info, X, LogIn } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import { publicHomestayService } from '../services/publicHomestayService'
import { ImageWithFallback } from '../components/figma/ImageWithFallback'
import PromotionPicker from '../components/customer/PromotionPicker'
import type { Homestay } from '../types/homestay.types'
import { bookingService } from '../services/bookingService'
import { authService } from '../services/authService'
import { promotionService } from '../services/promotionService'
import { experienceSchedulesService, type ExperienceSchedule } from '../services/experienceSchedulesService'
import PaymentModal from './customer/PaymentModal'
import toast from 'react-hot-toast'
import { apiService } from '../services/apiService'
import { apiConfig } from '../config/apiConfig'
import type { Review } from '../services/reviewService'
import { useWishlist } from '../contexts/WishlistContext'
import type { Promotion } from '../types/promotion.types'
import { experienceService } from '../services/experienceService'
import type { LocalExperience } from '../types/experience.types'
import type { OccupiedDateRange } from '../services/publicHomestayService'
import { getActiveSeasonalPricing, getSeasonalPricingForStay } from '../utils/homestaySeasonalPricing'
import { DayPicker } from 'react-day-picker'
import { format, startOfDay, addDays } from 'date-fns'
import 'react-day-picker/src/style.css'

const formatDateVi = (value?: string) => {
    const raw = String(value ?? '').slice(0, 10)
    if (!raw) return '—'
    const [year, month, day] = raw.split('-')
    if (!year || !month || !day) return raw
    return `${day}/${month}/${year}`
}

export default function HomestayDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { favorites, toggle } = useWishlist()
    const [homestay, setHomestay] = useState<Homestay | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [occupiedDateRanges, setOccupiedDateRanges] = useState<OccupiedDateRange[]>([])
    const [occupiedDatesLoading, setOccupiedDatesLoading] = useState(false)
    const [guests, setGuests] = useState(1)
    const [contactPhone, setContactPhone] = useState('')
    const [specialRequests, setSpecialRequests] = useState('')
    const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>([])
    const [promotionsLoading, setPromotionsLoading] = useState(false)
    const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null)
    const [couponCode, setCouponCode] = useState('')
    const [couponValidating, setCouponValidating] = useState(false)
    const [validatedCoupon, setValidatedCoupon] = useState<{ code: string; discountAmount: number; message?: string } | null>(null)
    const [experiences, setExperiences] = useState<LocalExperience[]>([])
    const [experiencesLoading, setExperiencesLoading] = useState(false)
    const [selectedExperienceQty, setSelectedExperienceQty] = useState<Record<string, number>>({})
    const [experienceSchedules, setExperienceSchedules] = useState<Record<string, ExperienceSchedule[]>>({})
    const [selectedExperienceScheduleIds, setSelectedExperienceScheduleIds] = useState<Record<string, string>>({})
    const [experienceSchedulesLoading, setExperienceSchedulesLoading] = useState(false)
    const [previewExperience, setPreviewExperience] = useState<LocalExperience | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const [calcResult, setCalcResult] = useState<number | null>(null)
    const [pendingBooking, setPendingBooking] = useState<{
        id: string; homestayName: string; checkIn: string; checkOut: string;
        totalNights: number; guestsCount: number; pricePerNight: number;
        bookingTotal: number; amountDue: number;
        depositAmount?: number; remainingAmount?: number; paymentLabel?: string;
    } | null>(null)
    const [isBooking, setIsBooking] = useState(false)
    const [reviews, setReviews] = useState<Review[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [showCalendar, setShowCalendar] = useState<'checkIn' | 'checkOut' | null>(null)
    const calendarRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        if (!id) return
        let mounted = true

        const loadOccupiedDates = async () => {
            setOccupiedDatesLoading(true)
            try {
                const ranges = await publicHomestayService.getOccupiedDates(id)
                if (!mounted) return
                setOccupiedDateRanges(Array.isArray(ranges) ? ranges : [])
            } catch (err) {
                console.error('Load occupied dates error', err)
                if (mounted) setOccupiedDateRanges([])
            } finally {
                if (mounted) setOccupiedDatesLoading(false)
            }
        }

        loadOccupiedDates()
        return () => { mounted = false }
    }, [id])

    // Ensure guests does not exceed homestay max when homestay loads/changes
    useEffect(() => {
        if (!homestay) return
        const max = homestay.maxGuests ?? 1
        setGuests((g) => Math.min(g, Math.max(1, max)))
    }, [homestay])

    useEffect(() => {
        let mounted = true

        const loadPromotions = async () => {
            setPromotionsLoading(true)
            try {
                const response = await promotionService.getActiveForCustomer()
                if (!mounted) return
                const raw = response as any
                const list: Promotion[] = Array.isArray(raw?.data)
                    ? raw.data
                    : Array.isArray(raw)
                        ? raw
                        : Array.isArray(raw?.items)
                            ? raw.items
                            : Array.isArray(raw?.Items)
                                ? raw.Items
                                : []
                setAvailablePromotions(list)
            } catch (error) {
                console.error('Load promotions error', error)
                // Cho phép hiển thị form ngay cả khi load promotions fail (có thể do chưa login)
                // User có thể chọn promotion sau khi login
                if (mounted) setAvailablePromotions([])
            } finally {
                if (mounted) setPromotionsLoading(false)
            }
        }

        loadPromotions()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        let mounted = true

        const loadExperiences = async () => {
            setExperiencesLoading(true)
            try {
                const list = await experienceService.list()
                if (!mounted) return
                setExperiences(list.filter((item) => item.isActive))
            } catch (error) {
                console.error('Load experiences error', error)
                if (mounted) setExperiences([])
            } finally {
                if (mounted) setExperiencesLoading(false)
            }
        }

        loadExperiences()
        return () => {
            mounted = false
        }
    }, [])

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
    // const facilities = homestay?.facilities ?? homestay?.facilityNames ?? homestay?.amenities ?? homestay?.amenityNames ?? []

    const nights = useMemo(() => {
        if (!checkIn || !checkOut) return 0
        const start = new Date(checkIn)
        const end = new Date(checkOut)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        return diff > 0 ? diff : 0
    }, [checkIn, checkOut])

    const parseYmdToDate = (value: string): Date | null => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
        const [year, month, day] = value.split('-').map(Number)
        const dt = new Date(year, month - 1, day)
        dt.setHours(0, 0, 0, 0)
        return Number.isNaN(dt.getTime()) ? null : dt
    }

    const isDateInsideOccupiedRanges = useCallback((date: Date) => {
        return occupiedDateRanges.some((range) => {
            const occupiedStart = parseYmdToDate(range.checkIn)
            const occupiedEnd = parseYmdToDate(range.checkOut)
            if (!occupiedStart || !occupiedEnd || occupiedEnd <= occupiedStart) return false
            // Rule chuẩn lưu trú: ngày checkout là ngày có thể nhận khách mới.
            return date >= occupiedStart && date < occupiedEnd
        })
    }, [occupiedDateRanges])

    // Merge các occupied ranges liền kề/chồng nhau thành các block lớn hơn
    // VD: [15-16] + [17-18] → [15-18] vì checkout của range trước = checkin của range sau (liền kề)
    const mergedOccupiedRanges = useMemo(() => {
        const parsed = occupiedDateRanges
            .map((r) => ({ from: parseYmdToDate(r.checkIn), to: parseYmdToDate(r.checkOut) }))
            .filter((r): r is { from: Date; to: Date } => r.from !== null && r.to !== null && r.to > r.from)
            .sort((a, b) => a.from.getTime() - b.from.getTime())

        const merged: { from: Date; to: Date }[] = []
        for (const range of parsed) {
            const last = merged[merged.length - 1]
            // Merge nếu range mới bắt đầu <= ngày kết thúc của range trước (liền kề hoặc chồng)
            if (last && range.from <= last.to) {
                last.to = range.to > last.to ? range.to : last.to
            } else {
                merged.push({ from: new Date(range.from), to: new Date(range.to) })
            }
        }
        return merged
    }, [occupiedDateRanges])

    // Lịch check-in: chỉ block các ngày lưu trú thực tế, không block ngày checkout.
    const checkInDisabledDays = useMemo(() => {
        const today = startOfDay(new Date())
        const rules: any[] = [{ before: today }]
        mergedOccupiedRanges.forEach(({ from, to }) => {
            rules.push({ from, to: addDays(to, -1) })
        })
        return rules
    }, [mergedOccupiedRanges])

    const bookedDayModifiers = useMemo(() => {
        return mergedOccupiedRanges.map(({ from, to }) => ({ from, to: addDays(to, -1) }))
    }, [mergedOccupiedRanges])

    const checkOutBookedDayModifiers = useMemo(() => {
        // Lịch checkout chỉ tô mờ các ngày thực sự không thể checkout.
        // Ngày bắt đầu block (from) có thể là checkout hợp lệ cho booking trước đó.
        return mergedOccupiedRanges
            .map(({ from, to }) => ({ from: addDays(from, 1), to: addDays(to, -1) }))
            .filter(({ from, to }) => from <= to)
    }, [mergedOccupiedRanges])

    // Tính ngày checkout tối đa: ngày bắt đầu của occupied range đầu tiên SAU check-in
    // Ví dụ: checkIn=14, có booking 16-18 → checkout chỉ được chọn tối đa ngày 16 (không qua được)
    const checkOutDisabledDays = useMemo(() => {
        const checkInDate = parseYmdToDate(checkIn)
        const minCheckout = checkInDate ? addDays(checkInDate, 1) : startOfDay(new Date())
        const rules: any[] = [{ before: minCheckout }]

        if (!checkInDate) return rules

        // Tìm merged block gần nhất có phần nào nằm SAU checkIn
        let nearestBlock: Date | null = null
        mergedOccupiedRanges.forEach(({ from, to }) => {
            if (to <= checkInDate) return
            const blockStart = from > checkInDate ? from : addDays(checkInDate, 1)
            if (!nearestBlock || blockStart < nearestBlock) {
                nearestBlock = blockStart
            }
        })

        // Chỉ disable các ngày SAU nearestBlock.
        // nearestBlock vẫn là ngày checkout hợp lệ (khách mới có thể check-in cùng ngày).
        if (nearestBlock) {
            rules.push({ after: nearestBlock as Date })
        }

        return rules
    }, [checkIn, mergedOccupiedRanges])

    const isCheckInOccupied = useMemo(() => {
        const selectedStart = parseYmdToDate(checkIn)
        if (!selectedStart) return false
        return isDateInsideOccupiedRanges(selectedStart)
    }, [checkIn, isDateInsideOccupiedRanges])

    const hasOccupiedConflict = useMemo(() => {
        const selectedStart = parseYmdToDate(checkIn)
        const selectedEnd = parseYmdToDate(checkOut)
        if (!selectedStart || !selectedEnd || selectedEnd <= selectedStart) return false

        return occupiedDateRanges.some((range) => {
            const occupiedStart = parseYmdToDate(range.checkIn)
            const occupiedEnd = parseYmdToDate(range.checkOut)
            if (!occupiedStart || !occupiedEnd || occupiedEnd <= occupiedStart) return false
            return selectedStart < occupiedEnd && selectedEnd > occupiedStart
        })
    }, [checkIn, checkOut, occupiedDateRanges])

    const hasDateBlocked = isCheckInOccupied || hasOccupiedConflict

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
                setShowCalendar(null)
            }
        }
        if (showCalendar !== null) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showCalendar])

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
                    promotionId: selectedPromotionId ?? undefined,
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
    }, [homestay?.id, checkIn, checkOut, guests, nights, selectedPromotionId])

    const avgRating = useMemo(() => {
        if (reviews.length === 0) return null
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
        return Math.round((sum / reviews.length) * 10) / 10
    }, [reviews])

    const locationCoords = useMemo(() => {
        const lat = Number(homestay?.latitude)
        const lng = Number(homestay?.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
        return { lat, lng }
    }, [homestay?.latitude, homestay?.longitude])

    const googleMapEmbedUrl = useMemo(() => {
        if (!locationCoords) return ''
        return `https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}&z=15&output=embed`
    }, [locationCoords])

    const googleMapOpenUrl = useMemo(() => {
        if (!locationCoords) return ''
        return `https://www.google.com/maps/search/?api=1&query=${locationCoords.lat},${locationCoords.lng}`
    }, [locationCoords])

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
        const price = getSeasonalPricingForStay(homestay?.seasonalPricings, checkIn, checkOut)?.price ?? homestay?.pricePerNight
        if (typeof price === 'number' && nights > 0) return price * nights
        return undefined
    }, [calcResult, homestay, nights, checkIn, checkOut])

    const baseBookingTotal = useMemo(() => {
        const price = homestay?.pricePerNight
        if (typeof price === 'number' && nights > 0) return price * nights
        return undefined
    }, [homestay?.pricePerNight, nights])

    const effectivePricePerNight = useMemo(() => {
        if (!nights || nights <= 0) return undefined
        if (computedTotal === undefined || !Number.isFinite(computedTotal)) return undefined
        return computedTotal / nights
    }, [computedTotal, nights])

    const isSeasonalPriceApplied = useMemo(() => {
        if (computedTotal === undefined || baseBookingTotal === undefined) return false
        return Math.abs(computedTotal - baseBookingTotal) >= 1
    }, [baseBookingTotal, computedTotal])

    const seasonalDelta = useMemo(() => {
        if (!isSeasonalPriceApplied || computedTotal === undefined || baseBookingTotal === undefined) {
            return 0
        }
        return computedTotal - baseBookingTotal
    }, [baseBookingTotal, computedTotal, isSeasonalPriceApplied])

    const selectedPromotion = useMemo(
        () => availablePromotions.find((promotion) => promotion.id === selectedPromotionId) ?? null,
        [availablePromotions, selectedPromotionId],
    )

    const availableExperiences = useMemo(() => {
        if (!homestay?.id) return []
        return experiences.filter((item) => String(item.homestayId || '').trim() === String(homestay.id).trim())
    }, [experiences, homestay?.id])

    useEffect(() => {
        let mounted = true

        const loadExperienceSchedules = async () => {
            if (!checkIn || !checkOut || availableExperiences.length === 0) {
                setExperienceSchedules({})
                setSelectedExperienceScheduleIds({})
                return
            }

            setExperienceSchedulesLoading(true)
            try {
                const checkInDate = String(checkIn).slice(0, 10)
                const checkOutDate = String(checkOut).slice(0, 10)

                const results = await Promise.all(
                    availableExperiences.map(async (experience) => {
                        try {
                            const list = await experienceSchedulesService.getSchedulesByExperienceId(experience.id)
                            const filtered = list.filter((schedule) => {
                                const scheduleDate = String(schedule.date ?? schedule.availableDate ?? schedule.serviceDate ?? '').slice(0, 10)
                                return Boolean(scheduleDate) && scheduleDate >= checkInDate && scheduleDate <= checkOutDate
                            })
                            return [experience.id, filtered] as const
                        } catch {
                            return [experience.id, [] as ExperienceSchedule[]] as const
                        }
                    }),
                )

                if (!mounted) return

                const nextMap: Record<string, ExperienceSchedule[]> = {}
                results.forEach(([experienceId, schedules]) => {
                    nextMap[experienceId] = schedules
                })

                setExperienceSchedules(nextMap)
                setSelectedExperienceScheduleIds((prev) => {
                    const next: Record<string, string> = {}
                    Object.entries(prev).forEach(([experienceId, scheduleId]) => {
                        if (nextMap[experienceId]?.some((schedule) => schedule.id === scheduleId)) {
                            next[experienceId] = scheduleId
                        }
                    })
                    return next
                })
            } finally {
                if (mounted) setExperienceSchedulesLoading(false)
            }
        }

        loadExperienceSchedules()

        return () => {
            mounted = false
        }
    }, [checkIn, checkOut, availableExperiences])

    const handleViewSchedules = async (experienceId: string) => {
        if (!checkIn || !checkOut) {
            toast('Vui lòng chọn ngày nhận và trả phòng trước')
            return
        }

        setExperienceSchedulesLoading(true)
        try {
            const parsed = await experienceSchedulesService.getSchedulesByExperienceId(experienceId)
            const checkInDate = String(checkIn).slice(0, 10)
            const checkOutDate = String(checkOut).slice(0, 10)
            const filtered = parsed.filter((schedule) => {
                const scheduleDate = String(schedule.date ?? schedule.availableDate ?? schedule.serviceDate ?? '').slice(0, 10)
                return Boolean(scheduleDate) && scheduleDate >= checkInDate && scheduleDate <= checkOutDate
            })
            setExperienceSchedules((prev) => ({ ...prev, [experienceId]: filtered }))
        } catch (err) {
            console.error('View schedules error', err)
            toast.error('Không thể tải lịch trình')
        } finally {
            setExperienceSchedulesLoading(false)
        }
    }

    const selectedExperienceItems = useMemo(
        () => availableExperiences
            .filter((item) => (selectedExperienceQty[item.id] ?? 0) > 0)
            .map((item) => ({ item, qty: selectedExperienceQty[item.id] ?? 0 })),
        [availableExperiences, selectedExperienceQty],
    )

    useEffect(() => {
        setSelectedExperienceScheduleIds((prev) => {
            let changed = false
            const next = { ...prev }

            Object.entries(selectedExperienceQty).forEach(([experienceId, qty]) => {
                const scheduleList = experienceSchedules[experienceId] ?? []

                if (qty <= 0 || scheduleList.length === 0) {
                    if (next[experienceId]) {
                        delete next[experienceId]
                        changed = true
                    }
                    return
                }

                if (!next[experienceId]) {
                    const firstAvailable = scheduleList.find((schedule) => {
                        const remainingSlots = typeof schedule.remainingSlots === 'number'
                            ? schedule.remainingSlots
                            : typeof schedule.currentParticipants === 'number' && typeof schedule.maxParticipants === 'number'
                                ? Math.max(schedule.maxParticipants - schedule.currentParticipants, 0)
                                : 1
                        return remainingSlots > 0
                    }) ?? scheduleList[0]
                    next[experienceId] = firstAvailable.id
                    changed = true
                }
            })

            return changed ? next : prev
        })
    }, [experienceSchedules, selectedExperienceQty])

    const selectedExperiencesEstimate = useMemo(
        () => selectedExperienceItems.reduce((sum, entry) => sum + ((entry.item.price ?? 0) * entry.qty), 0),
        [selectedExperienceItems],
    )

    const activeSeasonalPricing = useMemo(
        () => getActiveSeasonalPricing(homestay?.seasonalPricings),
        [homestay?.seasonalPricings],
    )

    const seasonalPricingForStay = useMemo(
        () => getSeasonalPricingForStay(homestay?.seasonalPricings, checkIn, checkOut),
        [checkIn, checkOut, homestay?.seasonalPricings],
    )

    const seasonalPricingToShow = seasonalPricingForStay ?? activeSeasonalPricing
    const seasonalDisplayPrice = seasonalPricingToShow?.price
    const hasSeasonalPricing = typeof seasonalDisplayPrice === 'number' && seasonalDisplayPrice > 0 && seasonalDisplayPrice !== homestay?.pricePerNight

    const handleValidateCoupon = async () => {
        const code = couponCode.trim().toUpperCase()
        if (!code) return
        setCouponValidating(true)
        try {
            const res = await promotionService.validateCoupon({
                code,
                subTotal: baseBookingTotal ?? 0,
            })
            const data = res as any
            if (data?.valid || data?.success) {
                setValidatedCoupon({
                    code,
                    discountAmount: data?.discountAmount ?? 0,
                    message: data?.message,
                })
                toast.success(`Áp dụng coupon thành công! Giảm ${(data?.discountAmount ?? 0).toLocaleString('vi-VN')}đ`)
            } else {
                setValidatedCoupon(null)
                toast.error(data?.message ?? 'Mã coupon không hợp lệ hoặc đã hết hạn')
            }
        } catch (e: any) {
            setValidatedCoupon(null)
            toast.error(e?.message ?? 'Không thể kiểm tra mã coupon')
        } finally {
            setCouponValidating(false)
        }
    }

    const handleBookingClick = async () => {
        if (!authService.isAuthenticated()) {
            navigate('/auth/login')
            return
        }

        if (!authService.isTokenValid()) {
            toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
            navigate('/auth/login')
            return
        }

        if (!checkIn || !checkOut) {
            toast.error('Vui lòng chọn ngày nhận và trả phòng')
            return
        }
        if (isPastDate(checkIn) || isPastDate(checkOut)) {
            toast.error('Không được chọn ngày trong quá khứ')
            return
        }
        if (nights <= 0) {
            toast.error('Ngày trả phải sau ngày nhận')
            return
        }
        if (hasDateBlocked) {
            toast.error('Khoảng ngày đã chọn trùng với lịch đã đặt, vui lòng chọn ngày khác')
            return
        }
        if (!contactPhone.trim()) {
            toast.error('Vui lòng nhập số điện thoại liên hệ')
            return
        }
        if (!/^0\d{9}$/.test(contactPhone.trim())) {
            toast.error('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)')
            return
        }
        if (selectedPromotion && baseBookingTotal !== undefined) {
            const minBookingAmount = selectedPromotion.minBookingAmount ?? selectedPromotion.minBookingValue ?? 0
            if (minBookingAmount > 0 && baseBookingTotal < minBookingAmount) {
                toast.error('Mã giảm giá chưa đạt điều kiện tối thiểu cho booking này')
                return
            }
        }

        setIsBooking(true)
        try {
            // Build experiences payload — localExperienceScheduleId là optional
            // (dịch vụ không có lịch trình vẫn được đặt bình thường)
            const experiencesPayload = selectedExperienceItems.map((entry) => ({
                experienceId: entry.item.id,
                quantity: entry.qty,
                ...(selectedExperienceScheduleIds[entry.item.id]
                    ? { localExperienceScheduleId: selectedExperienceScheduleIds[entry.item.id] }
                    : {}),
            }))

            const payload = {
                homestayId: homestay?.id,
                checkIn: checkIn,
                checkOut: checkOut,
                guestsCount: guests,
                contactPhone: contactPhone.trim(),
                ...(specialRequests ? { specialRequests: specialRequests.trim() } : {}),
                ...(selectedPromotionId ? { promotionId: selectedPromotionId } : {}),
                ...(validatedCoupon ? { couponCode: validatedCoupon.code } : {}),
                ...(experiencesPayload.length > 0 ? { experiences: experiencesPayload } : {}),
            } as any

            const res = await bookingService.createBooking(payload)
            if (res && res.success && res.data?.id) {
                const bookingData = res.data
                const bookingTotal = bookingData.totalPrice ?? computedTotal ?? (homestay!.pricePerNight * nights)
                const depositRate = (homestay!.depositPercentage ?? 20) / 100
                const depositAmount = bookingData.depositAmount ?? bookingTotal * depositRate
                const remainingAmount = bookingData.remainingAmount ?? bookingTotal - depositAmount
                setPendingBooking({
                    id: bookingData.id,
                    homestayName: homestay!.name,
                    checkIn,
                    checkOut,
                    totalNights: nights,
                    guestsCount: guests,
                    pricePerNight: effectivePricePerNight ?? homestay!.pricePerNight,
                    bookingTotal,
                    amountDue: depositAmount,
                    depositAmount,
                    remainingAmount,
                    paymentLabel: 'Đặt cọc',
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
    }

    const bookingButtonLabel = !authService.isAuthenticated() ? (
        <>
            <LogIn className="w-4 h-4" />
            Đăng nhập để đặt phòng
        </>
    ) : isBooking ? (
        <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Đang xử lý...
        </>
    ) : isCalculating ? 'Đang tính giá...' : 'Xác nhận đặt phòng';

    const bookingButtonDisabled = authService.isAuthenticated()
        ? isCalculating || isBooking || !checkIn || !checkOut || nights <= 0 || !contactPhone.trim() || hasDateBlocked
        : false;

    if (loading) {
        return (
            <MainLayout>
                <div className="max-w-[1600px] mx-auto px-4 py-8 text-center text-gray-600">Đang tải...</div>
            </MainLayout>
        )
    }

    if (error) {
        return (
            <MainLayout>
                <div className="max-w-[1600px] mx-auto px-4 py-8 text-center text-red-600">{error}</div>
            </MainLayout>
        )
    }

    if (!homestay) {
        return (
            <MainLayout>
                <div className="max-w-[1600px] mx-auto px-4 py-8 text-center text-gray-600">Không tìm thấy homestay.</div>
            </MainLayout>
        )
    }

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
                                            );
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
                                        {authService.isAuthenticated() && (
                                            <button
                                                onClick={async () => {
                                                    if (!homestay) return;
                                                    const isFav = favorites.has(homestay.id);
                                                    try {
                                                        await toggle(homestay.id);
                                                        toast.success(isFav ? 'Đã bỏ thích' : 'Đã lưu yêu thích');
                                                    } catch {
                                                        toast.error('Không thể thay đổi trạng thái yêu thích');
                                                    }
                                                }}
                                                className="p-2 rounded-full border hover:bg-gray-50 transition-colors"
                                                title={homestay && favorites.has(homestay.id) ? 'Bỏ thích' : 'Lưu yêu thích'}
                                            >
                                                <Heart className={`w-5 h-5 transition-colors ${homestay && favorites.has(homestay.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                                            </button>
                                        )}
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

                                <div className="mt-6">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-cyan-600" />
                                        Vị trí trên bản đồ
                                    </h4>

                                    {locationCoords ? (
                                        <>
                                            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                                                <iframe
                                                    title={`Google Map - ${homestay.name}`}
                                                    src={googleMapEmbedUrl}
                                                    className="w-full h-72"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-3">
                                                <p className="text-xs text-gray-500">
                                                    Tọa độ: {locationCoords.lat.toFixed(6)}, {locationCoords.lng.toFixed(6)}
                                                </p>
                                                <a
                                                    href={googleMapOpenUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-800 font-medium"
                                                >
                                                    Mở trên Google Maps
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                                            Homestay này chưa có thông tin kinh độ/vĩ độ để hiển thị bản đồ.
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                        <span className="text-2xl">👥</span>
                                        <div>
                                            <p className="text-xs text-gray-500">Số khách</p>
                                            <p className="font-semibold text-gray-900">{homestay.maxGuests} khách</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                        <span className="text-2xl">🛏️</span>
                                        <div>
                                            <p className="text-xs text-gray-500">Phòng ngủ</p>
                                            <p className="font-semibold text-gray-900">{homestay.bedrooms ?? 0} phòng</p>
                                        </div>
                                    </div>
                                    {(homestay.bathrooms ?? 0) > 0 && (
                                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                            <span className="text-2xl">🚿</span>
                                            <div>
                                                <p className="text-xs text-gray-500">Phòng tắm</p>
                                                <p className="font-semibold text-gray-900">{homestay.bathrooms} phòng</p>
                                            </div>
                                        </div>
                                    )}
                                    {(homestay.area ?? 0) > 0 && (
                                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                            <span className="text-2xl">📐</span>
                                            <div>
                                                <p className="text-xs text-gray-500">Diện tích</p>
                                                <p className="font-semibold text-gray-900">{homestay.area} m²</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Thông tin giờ nhận/trả phòng và cọc */}
                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {homestay.checkInTime && (
                                        <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                                            <span className="text-2xl">🔑</span>
                                            <div>
                                                <p className="text-xs text-blue-600">Giờ nhận phòng</p>
                                                <p className="font-semibold text-blue-900">( {homestay.checkInTime} )</p>
                                            </div>
                                        </div>
                                    )}
                                    {homestay.checkOutTime && (
                                        <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3 border border-purple-100">
                                            <span className="text-2xl">🚪</span>
                                            <div>
                                                <p className="text-xs text-purple-600">Giờ trả phòng</p>
                                                <p className="font-semibold text-purple-900">( {homestay.checkOutTime} )</p>
                                            </div>
                                        </div>
                                    )}
                                    {homestay.depositPercentage && (
                                        <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                                            <span className="text-2xl">💰</span>
                                            <div>
                                                <p className="text-xs text-orange-600">Tiền cọc</p>
                                                <p className="font-semibold text-orange-900">{homestay.depositPercentage}% giá phòng</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* <div className="mt-6">
                                    <h4 className="font-semibold mb-3">Danh sách facility của home</h4>
                                    {facilities.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {facilities.map((facility, index) => (
                                                <div key={`${facility}-${index}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 font-semibold">•</span>
                                                    <span className="font-medium">{facility}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">Không có thông tin facility</div>
                                    )}
                                </div> */}
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
                                        <div className="text-2xl font-bold">
                                            {(hasSeasonalPricing ? seasonalDisplayPrice : homestay.pricePerNight)?.toLocaleString('vi-VN')}đ <span className="text-sm font-medium text-gray-600">/ đêm</span>
                                        </div>
                                        {hasSeasonalPricing && homestay.pricePerNight ? (
                                            <div className="mt-1 space-y-1">
                                                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1 inline-block">
                                                    {seasonalPricingToShow?.name ? `Giá theo mùa: ${seasonalPricingToShow.name}` : 'Đang áp dụng giá theo mùa'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Giá niêm yết: <span className="line-through">{homestay.pricePerNight.toLocaleString('vi-VN')}đ</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 inline-block">
                                                Giá thực tế có thể thay đổi theo mùa/lễ. Chọn ngày để xem đơn giá áp dụng.
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right text-sm text-gray-600">
                                        {avgRating !== null ? `${avgRating} ★` : ''}
                                    </div>
                                </div>

                                {/* Hiển thị giờ nhận/trả phòng */}
                                {(homestay.checkInTime || homestay.checkOutTime) && (
                                    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
                                        <div className="text-xs font-semibold text-blue-900 mb-2">Giờ nhận / trả phòng (mặc định)</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {homestay.checkInTime && (
                                                <div>
                                                    <span className="text-blue-700">Giờ nhận phòng</span>
                                                    <p className="text-blue-900 font-semibold">( {homestay.checkInTime} )</p>
                                                </div>
                                            )}
                                            {homestay.checkOutTime && (
                                                <div>
                                                    <span className="text-blue-700">Giờ trả phòng</span>
                                                    <p className="text-blue-900 font-semibold">( {homestay.checkOutTime} )</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Step 1: Chọn ngày */}
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    {/* Ngày nhận */}
                                    <div className="relative">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-gray-500" />
                                            Ngày nhận
                                            {occupiedDatesLoading && <span className="text-xs text-gray-400 font-normal">...</span>}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowCalendar((v) => v === 'checkIn' ? null : 'checkIn')}
                                            className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-cyan-500 ${checkIn ? 'text-gray-900 border-gray-300' : 'text-gray-400 border-gray-300'}`}
                                        >
                                            {checkIn ? format(new Date(checkIn), 'dd/MM/yyyy') : 'Chọn ngày'}
                                        </button>
                                        {showCalendar === 'checkIn' && (
                                            <div ref={calendarRef} className="absolute z-50 mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-200 p-2 chms-calendar">
                                                <DayPicker
                                                    mode="single"
                                                    selected={checkIn ? new Date(checkIn) : undefined}
                                                    onSelect={(date) => {
                                                        if (!date) return
                                                        const val = format(date, 'yyyy-MM-dd')
                                                        setCheckIn(val)
                                                        // reset checkout nếu checkout <= checkin mới
                                                        if (checkOut && checkOut <= val) setCheckOut('')
                                                        setShowCalendar(null)
                                                    }}
                                                    disabled={checkInDisabledDays}
                                                    modifiers={{ booked: bookedDayModifiers }}
                                                    modifiersClassNames={{ today: 'rdp-today', booked: 'rdp-booked' }}
                                                />
                                                {occupiedDateRanges.length > 0 && (
                                                    <div className="px-3 pb-2 text-xs text-gray-400 flex items-center gap-1.5">
                                                        <span className="inline-block w-4 border-t border-gray-400" />
                                                        Ngày đã có khách đặt
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Ngày trả */}
                                    <div className="relative">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-gray-500" />
                                            Ngày trả
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowCalendar((v) => v === 'checkOut' ? null : 'checkOut')}
                                            className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-cyan-500 ${checkOut ? 'text-gray-900 border-gray-300' : 'text-gray-400 border-gray-300'}`}
                                        >
                                            {checkOut ? format(new Date(checkOut), 'dd/MM/yyyy') : 'Chọn ngày'}
                                        </button>
                                        {showCalendar === 'checkOut' && (
                                            <div ref={calendarRef} className="absolute z-50 mt-1 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-2 chms-calendar">
                                                <DayPicker
                                                    mode="single"
                                                    selected={checkOut ? new Date(checkOut) : undefined}
                                                    onSelect={(date) => {
                                                        if (!date) return
                                                        setCheckOut(format(date, 'yyyy-MM-dd'))
                                                        setShowCalendar(null)
                                                    }}
                                                    disabled={checkOutDisabledDays}
                                                    modifiers={{ booked: checkOutBookedDayModifiers }}
                                                    modifiersClassNames={{ today: 'rdp-today', booked: 'rdp-booked' }}
                                                />
                                                {occupiedDateRanges.length > 0 && (
                                                    <div className="px-3 pb-2 text-xs text-gray-500">
                                                        Ngày gạch = đã có khách đặt
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Default check-in / check-out times
                                {(homestay.checkInTime || homestay.checkOutTime) && (
                                    <div className="mt-3 text-sm text-gray-700 flex items-center gap-3">
                                        <CalendarDays className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        <div className="text-xs text-gray-500">
                                            {homestay.checkInTime && (
                                              <>
                                                Giờ nhận phòng: <span className="font-medium text-gray-900">{homestay.checkInTime}</span>
                                                <span className="mx-2">·</span>
                                              </>
                                            )}
                                            {homestay.checkOutTime && (
                                              <>
                                                Giờ trả phòng: <span className="font-medium text-gray-900">{homestay.checkOutTime}</span>
                                              </>
                                            )}
                                        </div>
                                    </div>
                                )} */}

                                {hasDateBlocked && (
                                    <div className="mt-2 text-xs text-gray-700 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2">
                                        {isCheckInOccupied && !checkOut
                                            ? 'Ngày nhận đã có khách đặt. Vui lòng chọn ngày nhận khác.'
                                            : 'Khoảng ngày đã chọn trùng với lịch đã đặt của homestay. Vui lòng chọn khoảng khác.'}
                                    </div>
                                )}


                                {/* Tóm tắt số đêm */}
                                {nights > 0 && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-2">
                                        <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>
                                            {nights} đêm · {(effectivePricePerNight ?? homestay.pricePerNight)?.toLocaleString('vi-VN')}đ × {nights} = <span className="font-semibold">{formatMoney(computedTotal ?? (homestay.pricePerNight * nights))}</span>
                                        </span>
                                    </div>
                                )}
                                {nights > 0 && isSeasonalPriceApplied && (
                                    <div className={`mt-2 text-xs rounded-lg px-3 py-2 border ${seasonalDelta > 0 ? 'text-red-700 bg-red-50 border-red-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100'}`}>
                                        {seasonalDelta > 0
                                            ? `Giá theo mùa đang cao hơn giá niêm yết ${formatMoney(seasonalDelta)} cho ${nights} đêm đã chọn.`
                                            : `Giá theo mùa đang thấp hơn giá niêm yết ${formatMoney(Math.abs(seasonalDelta))} cho ${nights} đêm đã chọn.`}
                                    </div>
                                )}

                                {/* Thông tin cọc */}
                                {homestay.depositPercentage && (
                                    <div className="mt-3 p-3 rounded-lg border border-orange-100 bg-orange-50 text-xs text-orange-900">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium">Tiền cọc (đặt cọc)</span>
                                            <span className="font-semibold">{homestay.depositPercentage}%</span>
                                        </div>
                                        {nights > 0 && (
                                            <div className="text-orange-800 font-medium">
                                                = {formatMoney((computedTotal ?? (homestay.pricePerNight * nights)) * homestay.depositPercentage / 100)}
                                            </div>
                                        )}
                                        <p className="mt-1 text-orange-700 text-xs">Thanh toán sau khi đặt phòng</p>
                                    </div>
                                )}

                                {/* Step 2: Số điện thoại liên hệ */}
                                <div className="mt-4">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-500" />
                                        Số điện thoại liên hệ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="VD: 0901234567"
                                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Step 3: Số khách */}
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

                                {/* Step 4: Promotion */}
                                <div className="mt-4">
                                    <PromotionPicker
                                        promotions={availablePromotions}
                                        loading={promotionsLoading}
                                        selectedPromotionId={selectedPromotionId}
                                        bookingTotal={baseBookingTotal}
                                        onSelectPromotion={setSelectedPromotionId}
                                    />
                                </div>

                                {/* Step 4b: Coupon code */}
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Mã coupon
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => {
                                                setCouponCode(e.target.value.toUpperCase())
                                                if (validatedCoupon) setValidatedCoupon(null)
                                            }}
                                            placeholder="Nhập mã coupon (VD: REWARD123)"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleValidateCoupon}
                                            disabled={!couponCode.trim() || couponValidating}
                                            className="px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {couponValidating ? 'Đang kiểm tra...' : 'Áp dụng'}
                                        </button>
                                    </div>
                                    {validatedCoupon && (
                                        <div className="mt-2 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                                            <div className="flex items-center gap-2 text-sm text-green-700">
                                                <span>✓</span>
                                                <span>Coupon <strong>{validatedCoupon.code}</strong> — Giảm {validatedCoupon.discountAmount.toLocaleString('vi-VN')}đ</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setValidatedCoupon(null); setCouponCode('') }}
                                                className="text-green-600 hover:text-green-800 text-xs font-medium ml-2"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Step 5: Dịch vụ địa phương */}
                                <div className="mt-4">
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-semibold text-gray-900">Dịch vụ địa phương</h4>
                                            <span className="text-xs text-cyan-700 font-medium">Có thể chọn ngay khi đặt phòng</span>
                                        </div>
                                        {experiencesLoading ? (
                                            <div className="text-sm text-gray-500">Đang tải danh sách dịch vụ...</div>
                                        ) : availableExperiences.length === 0 ? (
                                            <div className="text-sm text-gray-500">Chưa có dịch vụ địa phương khả dụng.</div>
                                        ) : (
                                            <div className="space-y-2 max-h-52 overflow-auto pr-1">
                                                {availableExperiences.map((item) => {
                                                    const qty = selectedExperienceQty[item.id] ?? 0
                                                    const checked = qty > 0
                                                    return (
                                                        <div key={item.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <label className="flex items-start gap-2 flex-1 cursor-pointer min-w-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={(e) => {
                                                                            const isChecked = e.target.checked
                                                                            setSelectedExperienceQty((prev) => ({
                                                                                ...prev,
                                                                                [item.id]: isChecked ? Math.max(1, prev[item.id] ?? 1) : 0,
                                                                            }))
                                                                            if (!isChecked) {
                                                                                setSelectedExperienceScheduleIds((prev) => {
                                                                                    const next = { ...prev }
                                                                                    delete next[item.id]
                                                                                    return next
                                                                                })
                                                                            }
                                                                        }}
                                                                        className="mt-1 flex-shrink-0"
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {item.categoryName ? `${item.categoryName} • ` : ''}
                                                                            {typeof item.price === 'number' ? `${item.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}
                                                                            {item.unit ? `/${item.unit}` : ''}
                                                                        </div>
                                                                    </div>
                                                                </label>

                                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewExperience(item)}
                                                                        className="p-1 rounded text-cyan-500 hover:bg-cyan-50 transition-colors"
                                                                        title="Xem chi tiết"
                                                                    >
                                                                        <Info className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleViewSchedules(item.id)}
                                                                        className="p-1 rounded text-cyan-500 hover:bg-cyan-50 transition-colors"
                                                                        title="Xem lịch trình"
                                                                    >
                                                                        <CalendarDays className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedExperienceQty((prev) => ({
                                                                                ...prev,
                                                                                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
                                                                            }))
                                                                            if ((selectedExperienceQty[item.id] ?? 0) <= 1) {
                                                                                setSelectedExperienceScheduleIds((prev) => {
                                                                                    const next = { ...prev }
                                                                                    delete next[item.id]
                                                                                    return next
                                                                                })
                                                                            }
                                                                        }}
                                                                        className="w-7 h-7 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="w-5 text-center text-sm font-medium">{qty}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedExperienceQty((prev) => ({
                                                                                ...prev,
                                                                                [item.id]: Math.min(9, (prev[item.id] ?? 0) + 1),
                                                                            }))
                                                                        }}
                                                                        className="w-7 h-7 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {selectedExperienceQty[item.id] > 0 && (
                                                                <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3">
                                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                                        <div className="text-xs font-semibold text-cyan-900">
                                                                            Lịch trình phù hợp với ngày booking
                                                                        </div>
                                                                        {experienceSchedulesLoading && (
                                                                            <div className="text-[11px] text-cyan-700">Đang tải...</div>
                                                                        )}
                                                                    </div>
                                                                    {!checkIn || !checkOut ? (
                                                                        <div className="text-xs text-gray-600">
                                                                            Vui lòng chọn ngày nhận và trả phòng trước để xem lịch trình.
                                                                        </div>
                                                                    ) : (experienceSchedules[item.id]?.length ?? 0) === 0 ? (
                                                                        <div className="text-xs text-gray-600">
                                                                            Hiện chưa có lịch trình nào trong khoảng ngày bạn đã chọn.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {experienceSchedules[item.id].map((schedule) => {
                                                                                const remainingSlots = typeof schedule.currentParticipants === 'number' && typeof schedule.maxParticipants === 'number'
                                                                                    ? Math.max(schedule.maxParticipants - schedule.currentParticipants, 0)
                                                                                    : typeof schedule.remainingSlots === 'number'
                                                                                        ? schedule.remainingSlots
                                                                                        : schedule.maxParticipants ?? 0
                                                                                const scheduleDateRaw = schedule.date ?? schedule.availableDate ?? schedule.serviceDate
                                                                                const isSelected = selectedExperienceScheduleIds[item.id] === schedule.id

                                                                                return (
                                                                                    <label
                                                                                        key={schedule.id}
                                                                                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'border-cyan-300 bg-white' : 'border-cyan-100 bg-white/80 hover:bg-white'}`}
                                                                                    >
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`schedule-${item.id}`}
                                                                                            checked={isSelected}
                                                                                            onChange={() => setSelectedExperienceScheduleIds((prev) => ({ ...prev, [item.id]: schedule.id }))}
                                                                                            className="mt-1"
                                                                                        />
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="text-sm font-medium text-gray-900">
                                                                                                {formatDateVi(scheduleDateRaw)}
                                                                                            </div>
                                                                                            <div className="text-xs text-gray-600 mt-1">
                                                                                                {schedule.startTime ?? '—'} - {schedule.endTime ?? '—'}
                                                                                                {typeof schedule.price === 'number' && schedule.price > 0 ? ` • ${schedule.price.toLocaleString('vi-VN')}đ` : ''}
                                                                                            </div>
                                                                                            <div className="text-[11px] text-gray-500 mt-1">
                                                                                                Còn {remainingSlots} chỗ
                                                                                            </div>
                                                                                        </div>
                                                                                    </label>
                                                                                )
                                                                            })}

                                                                            {null}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {selectedExperiencesEstimate > 0 && (
                                            <div className="mt-3 text-xs text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-2 py-1.5">
                                                Ước tính dịch vụ thêm: {selectedExperiencesEstimate.toLocaleString('vi-VN')}đ (tham khảo)
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`mt-5 rounded-xl border p-4 ${hasDateBlocked ? 'border-gray-300 bg-gray-100 opacity-80' : 'border-gray-100 bg-gray-50'}`}>
                                    <div className="flex items-center justify-between text-sm text-gray-700">
                                        <span>{nights > 0 ? `${(effectivePricePerNight ?? homestay.pricePerNight)?.toLocaleString('vi-VN')}đ × ${nights} đêm` : 'Chọn ngày để tính giá'}</span>
                                        <span className="font-medium">
                                            {nights > 0 ? formatMoney(computedTotal ?? (homestay.pricePerNight * nights)) : '—'}
                                        </span>
                                    </div>
                                    {nights > 0 && isSeasonalPriceApplied && baseBookingTotal !== undefined && (
                                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                                            <span>Giá niêm yết ban đầu</span>
                                            <span className="line-through">{formatMoney(baseBookingTotal)}</span>
                                        </div>
                                    )}
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
                                    {selectedPromotion && (
                                        <div className="mt-3 rounded-lg bg-cyan-50 border border-cyan-100 px-3 py-2 text-sm text-cyan-900">
                                            Đang áp dụng mã <span className="font-semibold">{selectedPromotion.code}</span>
                                        </div>
                                    )}
                                    {selectedExperienceItems.length > 0 && (
                                        <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-900">
                                            Bạn đã chọn {selectedExperienceItems.length} dịch vụ thêm cho booking này.
                                        </div>
                                    )}
                                    {computedTotal !== undefined && (
                                        <div className="mt-3 pt-3 border-t border-dashed border-orange-200 space-y-1.5">
                                            {(() => {
                                                const rate = (homestay.depositPercentage ?? 20) / 100;
                                                const deposit = computedTotal * rate;
                                                const remaining = computedTotal - deposit;
                                                const pct = homestay.depositPercentage ?? 20;
                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-orange-700 font-medium">Cọc ngay ({pct}%)</span>
                                                            <span className="font-bold text-orange-600">{formatMoney(deposit)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                                            <span>Còn lại khi nhận phòng</span>
                                                            <span className="font-medium">{formatMoney(remaining)}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                    {calcResult !== null && (
                                        <div className="mt-2 text-xs text-green-600">
                                            ✓ Giá đã được tính chính xác từ hệ thống
                                        </div>
                                    )}
                                </div>

                                {/* Step 5: Yêu cầu đặc biệt */}
                                <div className="mt-4 grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <MessageSquareText className="w-4 h-4 text-gray-500" />
                                            Yêu cầu đặc biệt (tuỳ chọn)
                                        </label>
                                        <textarea
                                            value={specialRequests}
                                            onChange={(e) => setSpecialRequests(e.target.value)}
                                            rows={2}
                                            placeholder="Ví dụ: nhận phòng sớm, thêm gối, ..."
                                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleBookingClick}
                                    disabled={bookingButtonDisabled}
                                    className={`w-full mt-5 py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${bookingButtonDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'}`}
                                >
                                    {bookingButtonLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                    {previewExperience && (
                        <div
                            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setPreviewExperience(null)}
                        >
                            <div
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {previewExperience.imageUrl && (
                                    <div className="h-48 overflow-hidden">
                                        <img
                                            src={previewExperience.imageUrl}
                                            alt={previewExperience.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{previewExperience.name}</h3>
                                            {previewExperience.categoryName && (
                                                <span className="inline-block mt-1 text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 rounded-full px-2.5 py-0.5 font-medium">
                                                    {previewExperience.categoryName}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setPreviewExperience(null)}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                                        >
                                            <X className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>
                                    {previewExperience.description && (
                                        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{previewExperience.description}</p>
                                    )}
                                    <div className="mt-4 flex items-center justify-between">
                                        <div>
                                            <span className="text-xl font-bold text-gray-900">
                                                {typeof previewExperience.price === 'number'
                                                    ? `${previewExperience.price.toLocaleString('vi-VN')}đ`
                                                    : 'Liên hệ'}
                                            </span>
                                            {previewExperience.unit && (
                                                <span className="text-sm text-gray-500 ml-1">/ {previewExperience.unit}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedExperienceQty((prev) => ({
                                                    ...prev,
                                                    [previewExperience.id]: Math.max(1, prev[previewExperience.id] ?? 1),
                                                }))
                                                setPreviewExperience(null)
                                            }}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
                                        >
                                            Thêm vào đơn
                                        </button>
                                    </div>
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
