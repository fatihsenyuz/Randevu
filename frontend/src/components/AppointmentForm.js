import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AppointmentForm = ({ services, appointment, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    customer_name: "",
    phone: "",
    address: "",
    service_id: "",
    appointment_date: new Date(),
    appointment_time: "",
    notes: ""
  });
  const [settings, setSettings] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    if (appointment) {
      setFormData({
        customer_name: appointment.customer_name,
        phone: appointment.phone,
        address: appointment.address,
        service_id: appointment.service_id,
        appointment_date: new Date(appointment.appointment_date),
        appointment_time: appointment.appointment_time,
        notes: appointment.notes || ""
      });
    }
  }, [appointment]);

  useEffect(() => {
    if (settings) {
      generateTimeSlots();
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Ayarlar yüklenemedi:", error);
    }
  };

  const generateTimeSlots = () => {
    if (!settings) return;

    const slots = [];
    const { work_start_hour, work_end_hour, appointment_interval } = settings;
    
    let currentHour = work_start_hour;
    let currentMinute = 0;

    while (true) {
      // Handle next day scenario (work_end_hour < work_start_hour)
      if (work_end_hour < work_start_hour) {
        if (currentHour === 24) {
          currentHour = 0;
        }
        if (currentHour === work_end_hour && currentMinute > 0) break;
        if (currentHour > work_end_hour && currentHour < work_start_hour) break;
      } else {
        if (currentHour > work_end_hour) break;
        if (currentHour === work_end_hour && currentMinute > 0) break;
      }

      const time = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
      slots.push(time);

      currentMinute += appointment_interval;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }

    setTimeSlots(slots);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.phone || !formData.service_id || !formData.appointment_time) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        appointment_date: format(formData.appointment_date, "yyyy-MM-dd")
      };

      if (appointment) {
        await axios.put(`${API}/appointments/${appointment.id}`, payload);
        toast.success("Randevu güncellendi");
      } else {
        await axios.post(`${API}/appointments`, payload);
        toast.success("Randevu oluşturuldu");
      }
      onSave();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "İşlem başarısız";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Button
          data-testid="back-button"
          onClick={onCancel}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>
        <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {appointment ? "Randevu Düzenle" : "Yeni Randevu"}
        </h2>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Müşteri Adı *</Label>
              <Input
                id="customer_name"
                data-testid="customer-name-input"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Ad Soyad"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                data-testid="phone-input"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              data-testid="address-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Müşteri adresi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Hizmet Türü *</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) => setFormData({ ...formData, service_id: value })}
            >
              <SelectTrigger data-testid="service-select">
                <SelectValue placeholder="Hizmet seçin" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {Math.round(service.price)}₺
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Randevu Tarihi *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="date-picker"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.appointment_date ? format(formData.appointment_date, "d MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.appointment_date}
                    onSelect={(date) => setFormData({ ...formData, appointment_date: date })}
                    locale={tr}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Saat *</Label>
              <Select
                value={formData.appointment_time}
                onValueChange={(value) => setFormData({ ...formData, appointment_time: value })}
              >
                <SelectTrigger data-testid="time-select">
                  <SelectValue placeholder="Saat seçin" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {time}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              data-testid="notes-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ek bilgiler, özel talepler..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              data-testid="save-appointment-button"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              {loading ? "Kaydediliyor..." : appointment ? "Güncelle" : "Randevu Oluştur"}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={loading}
            >
              İptal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AppointmentForm;