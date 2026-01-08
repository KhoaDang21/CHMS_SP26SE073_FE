import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Heart,
  Menu,
  Bell,
  User,
  LogOut,
  Settings,
  Home,
  BookOpen,
  Compass,
  MessageCircle,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Waves
} from 'lucide-react';
import { authService } from '../../services/authService';
import { toast } from 'sonner';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

// Mock data for homestays
const featuredHomestays = [
  {
    id: 1,
    name: 'Sunset Beach Villa',
    location: 'Nha Trang, Khánh Hòa',
    price: 2500000,
    rating: 4.9,
    reviews: 128,
    image: 'https://images.unsplash.com/photo-1712311082180-4fd73ded1b1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwdmlsbGF8ZW58MXx8fHwxNzY3ODIzMjY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    guests: 6,
    bedrooms: 3,
    isFavorite: true,
  },
  {
    id: 2,
    name: 'Ocean View Paradise',
    location: 'Đà Nẵng, Việt Nam',
    price: 1800000,
    rating: 4.8,
    reviews: 95,
    image: 'https://images.unsplash.com/photo-1761920555057-54bbc392135c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwaG9tZXN0YXl8ZW58MXx8fHwxNzY3ODUxOTYzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    guests: 4,
    bedrooms: 2,
    isFavorite: false,
  },
  {
    id: 3,
    name: 'Tropical Beachfront',
    location: 'Phú Quốc, Kiên Giang',
    price: 3200000,
    rating: 5.0,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1583401535382-a0814c295b0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMHZpZXclMjByZXNvcnR8ZW58MXx8fHwxNzY3ODUxOTYyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    guests: 8,
    bedrooms: 4,
    isFavorite: true,
  },
  {
    id: 4,
    name: 'Coastal Dream House',
    location: 'Vũng Tàu, Bà Rịa-Vũng Tàu',
    price: 1500000,
    rating: 4.7,
    reviews: 73,
    image: 'https://images.unsplash.com/photo-1709775901932-86f1c3137861?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwaG91c2V8ZW58MXx8fHwxNzY3ODUxOTYwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    guests: 5,
    bedrooms: 2,
    isFavorite: false,
  },
];

const upcomingBookings = [
  {
    id: 1,
    homestayName: 'Sunset Beach Villa',
    location: 'Nha Trang, Khánh Hòa',
    checkIn: '2026-01-15',
    checkOut: '2026-01-18',
    guests: 4,
    status: 'confirmed',
    image: 'https://images.unsplash.com/photo-1712311082180-4fd73ded1b1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwdmlsbGF8ZW58MXx8fHwxNzY3ODIzMjY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
];

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(1);

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  const stats = [
    { label: 'Upcoming Trips', value: '1', icon: Calendar, color: 'bg-blue-500' },
    { label: 'Favorites', value: '2', icon: Heart, color: 'bg-pink-500' },
    { label: 'Rewards Points', value: '1,250', icon: Star, color: 'bg-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Waves className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900">CHMS</h1>
                  <p className="text-xs text-gray-500">Coastal Homestay</p>
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell className="w-6 h-6 text-gray-700" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="hidden sm:block text-gray-700 font-medium">
                    {currentUser?.name || 'User'}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700">
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <hr className="my-2" />
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-30
          transition-transform duration-300 w-64
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <Home className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <Compass className="w-5 h-5" />
              <span className="font-medium">Explore</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">My Bookings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <Heart className="w-5 h-5" />
              <span className="font-medium">Favorites</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Messages</span>
            </button>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div>
              <h2 className="text-gray-900 mb-2">Welcome back, {currentUser?.name}! 👋</h2>
              <p className="text-gray-600">Find your perfect coastal getaway</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">Search Homestays</h3>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                  <SlidersHorizontal className="w-5 h-5" />
                  <span className="hidden sm:inline">Advanced Filters</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm text-gray-700 mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Where are you going?"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Check-in</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Check-out</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Guests</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                <Search className="w-5 h-5" />
                Search Homestays
              </button>
            </div>

            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">Upcoming Trips</h3>
                  <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-40 h-40 sm:h-auto relative">
                          <ImageWithFallback
                            src={booking.image}
                            alt={booking.homestayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{booking.homestayName}</h4>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {booking.location}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {booking.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(booking.checkIn).toLocaleDateString('vi-VN')}
                            </span>
                            <span>→</span>
                            <span>{new Date(booking.checkOut).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            {booking.guests} Guests
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Homestays */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">Featured Homestays</h3>
                <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredHomestays.map((homestay) => (
                  <div key={homestay.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                    <div className="relative h-48 overflow-hidden">
                      <ImageWithFallback
                        src={homestay.image}
                        alt={homestay.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                        <Heart className={`w-5 h-5 ${homestay.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      </button>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{homestay.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{homestay.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                        <MapPin className="w-4 h-4" />
                        {homestay.location}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {homestay.guests}
                        </span>
                        <span>{homestay.bedrooms} Bedrooms</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div>
                          <span className="font-bold text-gray-900">
                            {homestay.price.toLocaleString('vi-VN')}đ
                          </span>
                          <span className="text-sm text-gray-600">/night</span>
                        </div>
                        <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-sm">
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}