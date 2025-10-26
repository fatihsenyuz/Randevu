import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DollarSign, Edit, Trash2, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const CashRegister = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [editDialog, setEditDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");

  useEffect(() => {
    loadTransactions();
    loadStats();
  }, [dateFilter]);

  const loadTransactions = async () => {
    try {
      const today = new Date();
      let params = {};
      
      if (dateFilter === "today") {
        params.start_date = format(today, "yyyy-MM-dd");
        params.end_date = format(today, "yyyy-MM-dd");
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.start_date = format(weekAgo, "yyyy-MM-dd");
      } else if (dateFilter === "month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        params.start_date = format(monthStart, "yyyy-MM-dd");
      }

      const response = await axios.get(`${API}/transactions`, { params });
      setTransactions(response.data);
    } catch (error) {
      toast.error("İşlemler yüklenemedi");
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

  const handleEdit = (transaction) => {
    setEditDialog(transaction);
    setEditAmount(transaction.amount.toString());
  };

  const handleUpdateAmount = async () => {
    if (!editAmount || isNaN(parseFloat(editAmount))) {
      toast.error("Geçerli bir tutar girin");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/transactions/${editDialog.id}`, {
        amount: parseFloat(editAmount)
      });
      toast.success("Tutar güncellendi");
      setEditDialog(null);
      loadTransactions();
      loadStats();
    } catch (error) {
      toast.error("Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transactionId) => {
    try {
      await axios.delete(`${API}/transactions/${transactionId}`);
      toast.success("İşlem silindi");
      setDeleteDialog(null);
      loadTransactions();
      loadStats();
    } catch (error) {
      toast.error("Silme başarısız");
    }
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Kasa & Gelir Takibi
        </h2>
        <p className="text-sm text-gray-600 mt-1">Gelir raporlarınızı görüntüleyin ve yönetin</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Bugünkü Gelir</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.today_income.toFixed(2)}₺</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Haftalık Gelir</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.week_income.toFixed(2)}₺</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Aylık Gelir</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{stats.month_income.toFixed(2)}₺</p>
              </div>
              <Calendar className="w-10 h-10 text-purple-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Tabs for filtering */}
      <Tabs value={dateFilter} onValueChange={setDateFilter}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="today" data-testid="filter-today">Bugün</TabsTrigger>
          <TabsTrigger value="week" data-testid="filter-week">Bu Hafta</TabsTrigger>
          <TabsTrigger value="month" data-testid="filter-month">Bu Ay</TabsTrigger>
        </TabsList>

        <TabsContent value={dateFilter} className="mt-6">
          <div className="space-y-4">
            {/* Summary Card */}
            <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Toplam Gelir</p>
                  <p className="text-4xl font-bold mt-2">{totalAmount.toFixed(2)}₺</p>
                  <p className="text-blue-100 text-sm mt-1">{transactions.length} işlem</p>
                </div>
                <DollarSign className="w-16 h-16 text-blue-200" />
              </div>
            </Card>

            {/* Transactions List */}
            {transactions.length === 0 ? (
              <Card className="p-8 text-center">
                <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Henüz işlem bulunmuyor</p>
              </Card>
            ) : (
              transactions.map((transaction) => (
                <Card
                  key={transaction.id}
                  data-testid={`transaction-${transaction.id}`}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{transaction.customer_name}</h3>
                          <p className="text-sm text-gray-600">{transaction.service_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 ml-13">
                        <span>{format(new Date(transaction.date), "d MMMM yyyy", { locale: tr })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-green-600">
                        {transaction.amount.toFixed(2)}₺
                      </span>
                      <div className="flex gap-2">
                        <Button
                          data-testid={`edit-transaction-${transaction.id}`}
                          onClick={() => handleEdit(transaction)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          data-testid={`delete-transaction-${transaction.id}`}
                          onClick={() => setDeleteDialog(transaction)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Amount Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutarı Düzenle</DialogTitle>
            <DialogDescription>
              {editDialog?.customer_name} - {editDialog?.service_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Yeni Tutar (₺)</Label>
              <Input
                id="amount"
                data-testid="edit-amount-input"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialog(null)}>
              İptal
            </Button>
            <Button
              data-testid="save-amount-button"
              onClick={handleUpdateAmount}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-transaction"
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

export default CashRegister;