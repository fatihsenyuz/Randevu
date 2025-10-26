import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Clock, Phone, MessageSquare, Edit, Trash2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ appointments, stats, onEditAppointment, onNewAppointment, onRefresh }) => {
  const [view, setView] = useState("today"); // today, past, future
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    filterAppointments();
  }, [appointments, view, searchTerm]);

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.phone.includes(searchTerm) ||
          apt.service_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (view === "today") {
      filtered = filtered.filter((apt) => apt.appointment_date === today);
    } else if (view === "past") {
      filtered = filtered.filter((apt) => apt.appointment_date < today);
    } else if (view === "future") {
      filtered = filtered.filter((apt) => apt.appointment_date > today);
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) {
        return view === "past"
          ? b.appointment_date.localeCompare(a.appointment_date)
          : a.appointment_date.localeCompare(b.appointment_date);
      }
      return a.appointment_time.localeCompare(b.appointment_time);
    });

    setFilteredAppointments(filtered);
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await axios.put(`${API}/appointments/${appointmentId}`, { status: newStatus });
      toast.success("Durum güncellendi");
      onRefresh();
    } catch (error) {
      toast.error("Durum güncellenemedi");
    }
  };

  const handleDelete = async (appointmentId) => {
    try {
      await axios.delete(`${API}/appointments/${appointmentId}`);
      toast.success("Randevu silindi");
      setDeleteDialog(null);
      onRefresh();
    } catch (error) {
      toast.error("Randevu silinemedi");
    }
  };

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const getStatusBadge = (status) => {
    const variants = {
      Bekliyor: "default",
      Tamamlandı: "success",
      İptal: "destructive"
    };
    return <Badge variant={variants[status]} data-testid={`status-${status}`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Bugünkü Randevular</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.today_appointments}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Tamamlanan</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.today_completed}</p>
              </div>
              <Check className="w-10 h-10 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}
          </h2>
          <p className="text-sm text-gray-600 mt-1">Randevularınızı yönetin</p>
        </div>
        <Button
          data-testid="add-appointment-button"
          onClick={onNewAppointment}
          className="bg-blue-500 hover:bg-blue-600 text-white shadow-md"
        >
          + Yeni Randevu
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          data-testid="search-input"
          type="text"
          placeholder="Müşteri adı, telefon veya hizmet ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          data-testid="view-today"
          onClick={() => setView("today")}
          variant={view === "today" ? "default" : "outline"}
          className={view === "today" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Bugün ({appointments.filter(a => a.appointment_date === today).length})
        </Button>
        <Button
          data-testid="view-past"
          onClick={() => setView("past")}
          variant={view === "past" ? "default" : "outline"}
          className={view === "past" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Geçmiş ({appointments.filter(a => a.appointment_date < today).length})
        </Button>
        <Button
          data-testid="view-future"
          onClick={() => setView("future")}
          variant={view === "future" ? "default" : "outline"}
          className={view === "future" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          Gelecek ({appointments.filter(a => a.appointment_date > today).length})
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Randevu bulunamadı</p>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              data-testid={`appointment-card-${appointment.id}`}
              className="p-4 appointment-card hover:shadow-lg border-l-4"
              style={{
                borderLeftColor:
                  appointment.status === "Tamamlandı"
                    ? "#10b981"
                    : appointment.status === "İptal"
                    ? "#ef4444"
                    : "#f59e0b"
              }}
            >
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{appointment.customer_name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{appointment.service_name}</p>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      {format(new Date(appointment.appointment_date), "d MMMM yyyy", { locale: tr })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      {appointment.appointment_time}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{appointment.phone}</span>
                    <button
                      data-testid={`call-button-${appointment.id}`}
                      onClick={() => handleCall(appointment.phone)}
                      className="ml-2 p-1.5 hover:bg-green-100 rounded-full transition-colors"
                      title="Ara"
                    >
                      <Phone className="w-4 h-4 text-green-600" />
                    </button>
                    <button
                      data-testid={`whatsapp-button-${appointment.id}`}
                      onClick={() => handleWhatsApp(appointment.phone)}
                      className="p-1.5 hover:bg-green-100 rounded-full transition-colors"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Adres:</span> {appointment.address}
                  </p>

                  {appointment.notes && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Not:</span> {appointment.notes}
                    </p>
                  )}
                </div>

                <div className="flex lg:flex-col gap-2">
                  {appointment.status === "Bekliyor" && (
                    <Button
                      data-testid={`complete-button-${appointment.id}`}
                      onClick={() => handleStatusChange(appointment.id, "Tamamlandı")}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Tamamla
                    </Button>
                  )}
                  <Button
                    data-testid={`edit-button-${appointment.id}`}
                    onClick={() => onEditAppointment(appointment)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Düzenle
                  </Button>
                  {appointment.status === "Bekliyor" && (
                    <Button
                      data-testid={`cancel-button-${appointment.id}`}
                      onClick={() => handleStatusChange(appointment.id, "İptal")}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      İptal
                    </Button>
                  )}
                  <Button
                    data-testid={`delete-button-${appointment.id}`}
                    onClick={() => setDeleteDialog(appointment)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Randevuyu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.customer_name} için oluşturulan randevuyu silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-button"
              onClick={() => handleDelete(deleteDialog?.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;