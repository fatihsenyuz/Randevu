import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Clock, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState({
    work_start_hour: 7,
    work_end_hour: 3,
    appointment_interval: 30
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      toast.error("Ayarlar yüklenemedi");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (settings.work_start_hour < 0 || settings.work_start_hour > 23) {
      toast.error("Başlangıç saati 0-23 arası olmalı");
      return;
    }
    
    if (settings.work_end_hour < 0 || settings.work_end_hour > 23) {
      toast.error("Bitiş saati 0-23 arası olmalı");
      return;
    }
    
    if (settings.appointment_interval < 15 || settings.appointment_interval > 120) {
      toast.error("Randevu aralığı 15-120 dakika arası olmalı");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/settings`, {
        ...settings,
        id: "app_settings"
      });
      toast.success("Ayarlar kaydedildi");
    } catch (error) {
      toast.error("Ayarlar kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Ayarlar
        </h2>
        <p className="text-sm text-gray-600 mt-1">Çalışma saatlerinizi ve randevu ayarlarınızı düzenleyin</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Çalışma Saatleri</h3>
              <p className="text-sm text-gray-600">Randevu alabileceğiniz saatleri belirleyin</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start-hour">
                <Clock className="w-4 h-4 inline mr-2" />
                Başlangıç Saati
              </Label>
              <Input
                id="start-hour"
                data-testid="start-hour-input"
                type="number"
                min="0"
                max="23"
                value={settings.work_start_hour}
                onChange={(e) => setSettings({ ...settings, work_start_hour: parseInt(e.target.value) })}
                required
              />
              <p className="text-xs text-gray-500">Saat formatı: 0-23 (Örn: 7 = 07:00)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-hour">
                <Clock className="w-4 h-4 inline mr-2" />
                Bitiş Saati
              </Label>
              <Input
                id="end-hour"
                data-testid="end-hour-input"
                type="number"
                min="0"
                max="23"
                value={settings.work_end_hour}
                onChange={(e) => setSettings({ ...settings, work_end_hour: parseInt(e.target.value) })}
                required
              />
              <p className="text-xs text-gray-500">Saat formatı: 0-23 (Örn: 3 = 03:00 - ertesi gün)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">
              <Clock className="w-4 h-4 inline mr-2" />
              Randevu Aralığı (Dakika)
            </Label>
            <Input
              id="interval"
              data-testid="interval-input"
              type="number"
              min="15"
              max="120"
              step="15"
              value={settings.appointment_interval}
              onChange={(e) => setSettings({ ...settings, appointment_interval: parseInt(e.target.value) })}
              required
            />
            <p className="text-xs text-gray-500">Randevular arası süre (15-120 dakika)</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Örnek:</strong> Başlangıç saati <strong>{settings.work_start_hour}:00</strong>, 
              Bitiş saati <strong>{settings.work_end_hour}:00</strong>, 
              Her <strong>{settings.appointment_interval} dakika</strong>da bir randevu alınabilir.
            </p>
          </div>

          <Button
            data-testid="save-settings-button"
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Settings;