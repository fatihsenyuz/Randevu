import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Dashboard from "@/components/Dashboard";
import AppointmentForm from "@/components/AppointmentForm";
import ServiceManagement from "@/components/ServiceManagement";
import CashRegister from "@/components/CashRegister";
import Settings from "@/components/Settings";
import Customers from "@/components/Customers";
import ImportData from "@/components/ImportData";
import { Menu, Calendar, Briefcase, DollarSign, SettingsIcon, Users, Upload } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadServices();
    loadAppointments();
    loadStats();
    initializeDefaultServices();
  }, []);

  const initializeDefaultServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      if (response.data.length === 0) {
        const defaultServices = [
          { name: "Tek Adet Koltuk Takımı Yıkama", price: 450 },
          { name: "Koltuk Takımı Yıkama", price: 650 },
          { name: "Minderli Koltuk Takımı Yıkama", price: 750 },
          { name: "Yastıklı Koltuk Takımı Yıkama", price: 700 },
          { name: "L Koltuk Yıkama", price: 800 },
          { name: "Chester Koltuk Takımı Yıkama", price: 900 }
        ];
        
        for (const service of defaultServices) {
          await axios.post(`${API}/services`, service);
        }
        loadServices();
      }
    } catch (error) {
      console.error("Varsayılan hizmetler yüklenemedi:", error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      toast.error("Hizmetler yüklenemedi");
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments`);
      setAppointments(response.data);
    } catch (error) {
      toast.error("Randevular yüklenemedi");
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error("İstatistikler yüklenemedi:", error);
    }
  };

  const handleAppointmentSaved = () => {
    loadAppointments();
    loadStats();
    setShowForm(false);
    setSelectedAppointment(null);
  };

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowForm(true);
  };

  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setShowForm(true);
  };

  const menuItems = [
    { id: "dashboard", icon: Calendar, label: "Randevular" },
    { id: "customers", icon: Users, label: "Müşteriler" },
    { id: "services", icon: Briefcase, label: "Hizmetler" },
    { id: "cash", icon: DollarSign, label: "Kasa" },
    { id: "import", icon: Upload, label: "İçe Aktar" },
    { id: "settings", icon: SettingsIcon, label: "Ayarlar" }
  ];

  return (
    <div className="App min-h-screen bg-white">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-blue-100 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Royal Koltuk Yıkama
                </h1>
                <p className="text-xs text-blue-600">Randevu Yönetim Sistemi</p>
              </div>
            </div>
            
            <button
              data-testid="mobile-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-blue-900" />
            </button>
            
            <nav className="hidden md:flex gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    data-testid={`nav-${item.id}`}
                    onClick={() => {
                      setCurrentView(item.id);
                      setShowForm(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      currentView === item.id
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 flex flex-col gap-2 pb-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    data-testid={`mobile-nav-${item.id}`}
                    onClick={() => {
                      setCurrentView(item.id);
                      setShowForm(false);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      currentView === item.id
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentView === "dashboard" && !showForm && (
          <Dashboard
            appointments={appointments}
            stats={stats}
            onEditAppointment={handleEditAppointment}
            onNewAppointment={handleNewAppointment}
            onRefresh={() => {
              loadAppointments();
              loadStats();
            }}
          />
        )}
        
        {currentView === "dashboard" && showForm && (
          <AppointmentForm
            services={services}
            appointment={selectedAppointment}
            onSave={handleAppointmentSaved}
            onCancel={() => {
              setShowForm(false);
              setSelectedAppointment(null);
            }}
          />
        )}
        
        {currentView === "services" && (
          <ServiceManagement
            services={services}
            onRefresh={loadServices}
          />
        )}
        
        {currentView === "cash" && (
          <CashRegister />
        )}
        
        {currentView === "settings" && (
          <Settings />
        )}
      </main>
    </div>
  );
}

export default App;