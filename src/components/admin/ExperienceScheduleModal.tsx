import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import type { LocalExperience } from '../../types/experience.types';
import {
  experienceSchedulesService,
  type ExperienceSchedule,
  type ScheduleParticipant,
} from '../../services/experienceSchedulesService';

interface ExperienceScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: LocalExperience | null;
}

const dayOptions = [
  { value: 0, label: 'CN' },
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
];

const formatDateInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDisplayDate = (value?: string) => {
  if (!value) return '-';
  const parsed = parseDate(value.slice(0, 10) || value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDateRangePreview = (startDate: string, endDate: string, daysOfWeek: number[]) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end < start || daysOfWeek.length === 0) return [] as string[];

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export default function ExperienceScheduleModal({ isOpen, onClose, experience }: ExperienceScheduleModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [maxQuantity, setMaxQuantity] = useState('10');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0]);
  const [saving, setSaving] = useState(false);
  const [createdSchedules, setCreatedSchedules] = useState<ExperienceSchedule[]>([]);
  const [lookupScheduleId, setLookupScheduleId] = useState('');
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participants, setParticipants] = useState<ScheduleParticipant[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    setStartDate(formatDateInput(today.toISOString()));
    setEndDate(formatDateInput(nextWeek.toISOString()));
    setStartTime('08:00');
    setEndTime('10:00');
    setMaxQuantity('10');
    setDaysOfWeek([0]);
    setCreatedSchedules([]);
    setParticipants([]);
    setLookupScheduleId('');
    setError('');
  }, [isOpen, experience?.id]);

  const previewDates = useMemo(
    () => getDateRangePreview(startDate, endDate, daysOfWeek),
    [daysOfWeek, endDate, startDate],
  );

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) => (
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort((a, b) => a - b)
    ));
  };

  const handleCreateSchedules = async () => {
    setError('');

    if (!experience?.id) {
      setError('Vui lòng chọn dịch vụ địa phương trước.');
      return;
    }

    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);
    const quantity = Number(maxQuantity);

    if (!parsedStart || !parsedEnd) {
      setError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (parsedEnd < parsedStart) {
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }
    if (daysOfWeek.length === 0) {
      setError('Vui lòng chọn ít nhất một ngày trong tuần.');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setError('Vui lòng chọn giờ bắt đầu và giờ kết thúc.');
      return;
    }
    if (!(quantity > 0)) {
      setError('Số lượng tối đa phải lớn hơn 0.');
      return;
    }

    setSaving(true);
    try {
      const schedulesDates = getDateRangePreview(startDate, endDate, daysOfWeek);
      const result = await experienceSchedulesService.bulkCreateSchedules({
        experienceId: experience.id,
        schedules: schedulesDates.map((date) => ({
          date,
          startTime,
          endTime,
          maxParticipants: quantity,
        })),
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể tạo lịch trình');
        return;
      }

      setCreatedSchedules(result.data ?? []);
      toast.success(result.message || 'Tạo lịch trình thành công');
    } catch (error) {
      console.error('Create schedules error:', error);
      toast.error('Không thể tạo lịch trình');
    } finally {
      setSaving(false);
    }
  };

  const handleLookupParticipants = async (scheduleIdInput?: string) => {
    const scheduleId = (scheduleIdInput ?? lookupScheduleId).trim();
    if (!scheduleId) {
      toast.error('Vui lòng nhập schedule ID');
      return;
    }

    setLookupScheduleId(scheduleId);
    setParticipantsLoading(true);
    try {
      const list = await experienceSchedulesService.getScheduleParticipants(scheduleId);
      setParticipants(list);
      if (list.length === 0) {
        toast.info('Chưa có người tham gia hoặc schedule không tồn tại');
      }
    } catch (error) {
      console.error('Lookup participants error:', error);
      toast.error('Không thể tải danh sách người tham gia');
    } finally {
      setParticipantsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] lg:max-w-[1600px] max-h-[92vh] overflow-y-auto px-8 py-8">
        <DialogHeader>
          <DialogTitle>Quản lý timeline hoạt động</DialogTitle>
          <DialogDescription>
            {experience
              ? `Tạo lịch hoạt động cho dịch vụ "${experience.name}" tại ${experience.homestayName || 'homestay hiện tại'}.`
              : 'Chọn một dịch vụ địa phương để tạo timeline hoạt động.'}
          </DialogDescription>
        </DialogHeader>

        {!experience ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Chưa chọn dịch vụ nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{experience.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{experience.categoryName || 'Không phân loại'}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="font-medium text-gray-700">{experience.homestayName || 'Không rõ homestay'}</div>
                    <div>{typeof experience.price === 'number' ? `${experience.price.toLocaleString('vi-VN')}đ` : 'Giá liên hệ'}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 border border-gray-200"><MapPin className="w-3.5 h-3.5" />{experience.homestayId || 'Không có homestay'}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 border border-gray-200"><Users className="w-3.5 h-3.5" />Timeline theo ngày trong tuần</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  Tạo lịch hàng loạt
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày bắt đầu *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày kết thúc *</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giờ bắt đầu *</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giờ kết thúc *</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng tối đa *</label>
                    <input
                      type="number"
                      min={1}
                      value={maxQuantity}
                      onChange={(e) => setMaxQuantity(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày trong tuần *</label>
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${daysOfWeek.includes(day.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                  <div className="font-medium">Preview lịch tạo</div>
                  <div className="mt-1 text-blue-800">
                    {previewDates.length > 0
                      ? `${previewDates.length} ngày sẽ được tạo: ${previewDates.slice(0, 8).map(formatDisplayDate).join(', ')}${previewDates.length > 8 ? ' ...' : ''}`
                      : 'Chọn khoảng ngày và ngày trong tuần để xem preview.'}
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateSchedules()}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? 'Đang tạo...' : 'Tạo lịch'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Lịch vừa tạo</h4>
                {createdSchedules.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có lịch nào được tạo trong phiên này.</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {createdSchedules.map((schedule) => (
                      <div key={schedule.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {formatDisplayDate(schedule.date)}
                            </div>
                            <div className="text-gray-600 mt-1">
                              <Clock3 className="inline-block w-4 h-4 mr-1 align-text-bottom" />
                              {schedule.startTime || startTime} - {schedule.endTime || endTime}
                            </div>
                          </div>
                          <div className="text-right text-gray-600">
                            <div>{schedule.maxParticipants ?? maxQuantity} chỗ</div>
                            {schedule.status && <div className="text-xs">{schedule.status}</div>}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {schedule.id && (
                            <div className="text-xs text-gray-500 break-all">Schedule ID: {schedule.id}</div>
                          )}
                          {schedule.id && (
                            <button
                              type="button"
                              onClick={() => void handleLookupParticipants(schedule.id)}
                              className="ml-auto rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Xem người tham gia
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  Tra cứu người tham gia
                </h4>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule ID</label>
                <input
                  value={lookupScheduleId}
                  onChange={(e) => setLookupScheduleId(e.target.value)}
                  placeholder="Nhập schedule ID"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => void handleLookupParticipants()}
                  disabled={participantsLoading}
                  className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {participantsLoading ? 'Đang tải...' : 'Xem người tham gia'}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Danh sách người tham gia</h4>
                {participants.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>
                ) : (
                  <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                    {participants.map((participant) => (
                      <div key={participant.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                        <div className="font-medium text-gray-900">{participant.name}</div>
                        <div className="text-gray-600">{participant.email}</div>
                        <div className="text-gray-500 mt-1">{participant.phone || '-'} · {participant.status || 'CONFIRMED'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
