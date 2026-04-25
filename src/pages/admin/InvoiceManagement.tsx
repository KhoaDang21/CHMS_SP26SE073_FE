import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Building2,
  Download,
  Loader2,
  Receipt,
  CalendarDays,
  DollarSign,
  User,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { invoiceService } from '../../services/invoiceService';
import { RoleBadge } from '../../components/common/RoleBadge';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { adminNavItemsGrouped } from '../../config/adminNavItemsGrouped';
import { toast } from 'sonner';

interface InvoiceItem {
  id: string;
  bookingId: string;
  bookingCode?: string;
  customerName?: string;
  homestayName?: string;
  totalAmount: number;
  invoiceDate?: string;
  paymentStatus?: string;
}

export default function InvoiceManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const response = await invoiceService.getAllInvoicesAdmin();
      const data = response?.data ?? response?.result ?? response ?? [];
      
      // Normalize data
      const normalized = Array.isArray(data) ? data : data.items || [];
      setInvoices(
        normalized.map((item: any) => ({
          id: item.id || item.invoiceId || '',
          bookingId: item.bookingId || '',
          bookingCode: item.bookingCode || '',
          customerName: item.customerName || 'N/A',
          homestayName: item.homestayName || 'N/A',
          totalAmount: Number(item.totalAmount || 0),
          invoiceDate: item.invoiceDate || item.createdAt || new Date().toISOString(),
          paymentStatus: item.paymentStatus || 'Pending',
        }))
      );
    } catch (error) {
      console.error('Load invoices error:', error);
      toast.error('Không thể tải danh sách hoá đơn');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await invoiceService.exportInvoicesAdminExcel();
      if (!blob) {
        toast.error('Không thể export hoá đơn');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Xuất hoá đơn thành công!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất hoá đơn');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('vi-VN');
    } catch {
      return date;
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      paid: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-700' },
      pending: { label: 'Chưa thanh toán', color: 'bg-orange-100 text-orange-700' },
      cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
      refunded: { label: 'Đã hoàn tiền', color: 'bg-blue-100 text-blue-700' },
    };

    const s = statusMap[status?.toLowerCase() || 'pending'];
    return s ? (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.color}`}>
        {s.label}
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
        {status || 'N/A'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Admin</h1>
              <p className="text-xs text-gray-500">Hệ thống quản trị</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          <AdminSidebar groupedItems={adminNavItemsGrouped} />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
              <div className="mt-1">{user?.role && <RoleBadge role={user.role} size="sm" />}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Quản lý Hoá đơn</h2>
                  <p className="text-xs text-gray-500">Xem và xuất danh sách hoá đơn</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || invoices.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Xuất Excel
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Đang tải hoá đơn...</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Không có hoá đơn nào</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Mã hoá đơn
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Khách hàng
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Homestay
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Ngày
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Số tiền
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          {invoice.bookingCode || invoice.bookingId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {invoice.customerName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {invoice.homestayName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            {formatDate(invoice.invoiceDate || '')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            {formatCurrency(invoice.totalAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {getStatusBadge(invoice.paymentStatus)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
                Tổng cộng: <span className="font-semibold text-gray-900">{invoices.length}</span> hoá đơn
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
