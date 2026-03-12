import MainLayout from '../layouts/MainLayout';
import { Users, Target, Award, Heart, Shield, Headphones } from 'lucide-react';

export default function AboutPage() {
  const features = [
    {
      icon: Shield,
      title: "An Toàn & Tin Cậy",
      description: "Tất cả homestay đều được xác minh và đánh giá kỹ lưỡng"
    },
    {
      icon: Award,
      title: "Chất Lượng Đảm Bảo",
      description: "Cam kết chất lượng dịch vụ và trải nghiệm tốt nhất"
    },
    {
      icon: Headphones,
      title: "Hỗ Trợ 24/7",
      description: "Đội ngũ hỗ trợ khách hàng luôn sẵn sàng phục vụ"
    },
    {
      icon: Heart,
      title: "Trải Nghiệm Độc Đáo",
      description: "Mỗi homestay mang đến trải nghiệm riêng biệt và đáng nhớ"
    }
  ];

  const stats = [
    { number: "500+", label: "Homestay" },
    { number: "10,000+", label: "Khách Hàng" },
    { number: "4.8/5", label: "Đánh Giá" },
    { number: "15+", label: "Tỉnh Thành" }
  ];

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Về CHMS
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Hệ thống quản lý homestay ven biển hàng đầu Việt Nam
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 md:p-12 mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Sứ Mệnh Của Chúng Tôi</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              CHMS (Coastal Homestay Management System) được xây dựng với mục tiêu kết nối du khách 
              với những homestay ven biển tuyệt đẹp nhất Việt Nam. Chúng tôi cam kết mang đến trải nghiệm 
              đặt phòng dễ dàng, an toàn và những kỳ nghỉ đáng nhớ bên bờ biển xanh.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Tại Sao Chọn CHMS?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
          <div className="text-center max-w-3xl mx-auto">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Đội Ngũ Của Chúng Tôi</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              CHMS được phát triển bởi đội ngũ sinh viên FPT University - SP26SE073. 
              Chúng tôi đam mê công nghệ và du lịch, luôn nỗ lực để mang đến những giải pháp 
              tốt nhất cho cả chủ homestay và du khách.
            </p>
            <div className="inline-block bg-blue-50 px-6 py-3 rounded-lg">
              <p className="text-blue-900 font-medium">FPT University - Dự án SP26SE073</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}