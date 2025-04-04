import React, { useState, useEffect } from 'react';
import { parse, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Trash2, Package, MapPin, X } from 'lucide-react';
import axios from 'axios';
import logo from './Images/Norisck.png';
import { Check } from 'lucide-react';

type OrderStatus = 'pago' | 'agendado' | 'pre_postagem' | 'nao_pago' | 'retirar' | 'postado' | 'entregue';

interface Order {
  _id: string;
  telefone: string;
  nome: string;
  cpf: string;
  valor: number;
  unidades: string;
  endereco: string;
  codigoRastreio: string;
  data: string; // A data deve ser uma string no formato ISO
  status: OrderStatus;
}

interface Notification {
  orderId: string;
  message: string;
  read: boolean;
}
interface Evento {
  descricaoEvento: string; // Descrição do evento
  data: string;            // Data do evento (por exemplo)
  [key: string]: any;      // Outros campos que podem existir, caso necessário
}

interface TrackingEvent {
  descricao: string;
  municipio: string;
  data: string;
}

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sentNotifications, setSentNotifications] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [searchName, setSearchName] = useState('');
  const [formData, setFormData] = useState({
    telefone: '',
    nome: '',
    cpf: '',
    valor: '',
    unidades: '',
    endereco: '',
    codigoRastreio: '',
    data: format(new Date(), 'yyyy-MM-dd'), // Formato correto para input type="date"
    status: 'nao_pago' as OrderStatus,
  });
  const [trackingInfo, setTrackingInfo] = useState<TrackingEvent[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); // Novo estado para controle de edição

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/pedidos`);
        setOrders(response.data); // Preenche o estado com os pedidos retornados
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      }
    };

    fetchOrders();
  }, []);
  const filteredOrders = orders.filter(order => {
    const dateMatch = selectedDate ? format(parse(order.data, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd') === selectedDate : true;
    const statusMatch = selectedStatus ? order.status === selectedStatus : true;
    const nameMatch = order.nome.toLowerCase().includes(searchName.toLowerCase()); // Filtro por nome (case-insensitive)

    return dateMatch && statusMatch && nameMatch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder = {
      telefone: formData.telefone,
      nome: formData.nome,
      cpf: formData.cpf,
      valor: parseFloat(formData.valor),
      unidades: formData.unidades,
      endereco: formData.endereco,
      codigoRastreio: formData.codigoRastreio,
      data: formData.data,
      status: formData.status,
    };

    try {
      if (isEditing) {
        const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/pedidos/${selectedOrderId}`, newOrder);
        setOrders(orders.map(order => (order._id === selectedOrderId ? response.data : order)));
        setIsEditing(false);
      } else {
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/pedidos`, newOrder);
        setOrders([...orders, response.data]);
      }

      // Reseta o formulário após o envio
      setFormData({
        telefone: '',
        nome: '',
        cpf: '',
        valor: '',
        unidades: '',
        endereco: '',
        codigoRastreio: '',
        data: format(new Date(), 'yyyy-MM-dd'), // Reseta a data para o formato correto
        status: 'nao_pago',
      });
    } catch (error) {
      console.error('Erro ao salvar o pedido:', error);
      alert('Erro ao salvar o pedido. Por favor, tente novamente.');
    }
  };

  const handleEdit = (order: Order) => {
    setFormData({
      telefone: order.telefone,
      nome: order.nome,
      cpf: order.cpf,
      valor: order.valor.toString(),
      unidades: order.unidades,
      endereco: order.endereco,
      codigoRastreio: order.codigoRastreio,
      data: order.data, // A data deve ser uma string no formato ISO
      status: order.status,
    });
    setSelectedOrderId(order._id);
    setIsEditing(true); // Ativa o modo de edição
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Você realmente deseja excluir este cliente?");

    if (!confirmDelete) {
      return; // Se o usuário cancelar, a função para aqui
    }

    console.log('Tentando deletar o pedido com ID:', id);

    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/pedidos/${id}`);
      setOrders(orders.filter(order => order._id !== id)); // Atualiza a lista de pedidos
    } catch (error) {
      console.error('Erro ao deletar o pedido:', error);
      alert('Erro ao deletar o pedido. Por favor, tente novamente.');
    }
  };


  const handleStatusChange = (id: string, newStatus: OrderStatus) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order._id === id ? { ...order, status: newStatus } : order
      )
    );
  };

  const fetchTrackingInfo = async (codigo: string, orderId: string) => {
    try {
      const response = await axios.post(
        '/api/correios', // Certifique-se de que esta rota está correta
        {
          objetos: [codigo]
        },
        {
          headers: {
            'Authorization': 'Basic NTM0NDk5OTUwMDAxMzk6R1VscDVkcU1wVkRkWmNRT05yeWVuWXZvSVpyUmdRZXVoRWVGU2pxVg==', // Substitua pelo seu token
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('Resposta da API:', response.data);

      if (response.data.length > 0 && response.data[0].eventos && Array.isArray(response.data[0].eventos)) {
        const eventos = response.data[0].eventos;

        const formattedEvents = eventos.map((evento: any) => {
          let dataFormatada = 'Data não disponível';

          if (evento.dataEvento) {
            try {
              const parsedDate = parse(evento.dataEvento, 'dd/MM/yyyy HH:mm:ss', new Date(), { locale: ptBR });
              dataFormatada = format(parsedDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
            } catch (error) {
              console.error('Erro ao converter data:', evento.dataEvento, error);
            }
          }

          return {
            descricao: evento.descricaoEvento,
            municipio: evento.municipio || 'N/A',
            data: dataFormatada,
          };
        });

        console.log('Eventos formatados:', formattedEvents);
        setTrackingInfo(formattedEvents);
        setSelectedOrderId(orderId);
        setIsTrackingOpen(true);
      } else {
        console.warn('Nenhum dado de rastreio encontrado:', codigo);
        alert('Não foram encontradas informações de rastreio para este código.');
        setTrackingInfo([]);
        setSelectedOrderId(null);
        setIsTrackingOpen(false);
      }
    } catch (error) {
      console.error('Erro ao buscar rastreamento:', error);
      alert('Erro ao buscar informações de rastreio. Por favor, tente novamente.');
      setTrackingInfo([]);
      setSelectedOrderId(null);
      setIsTrackingOpen(false);
    }
  };

  const checkDeliveryStatus = async () => {
    const updatedOrders = [...orders]; // Cria uma cópia da lista de pedidos

    for (let i = 0; i < updatedOrders.length; i++) {
      const order = updatedOrders[i];

      if (order.codigoRastreio) {
        try {
          const response = await axios.post(
            '/api/correios',
            {
              objetos: [order.codigoRastreio]
            },
            {
              headers: {
                'Authorization': 'Basic NTM0NDk5OTUwMDAxMzk6R1VscDVkcU1wVkRkWmNRT05yeWVuWXZvSVpyUmdRZXVoRWVGU2pxVg==', // Seu token
                'Content-Type': 'application/json',
              }
            }
          );

          console.log('Resposta da API:', response.data);

          if (response.data.length > 0 && response.data[0].eventos && Array.isArray(response.data[0].eventos)) {
            const eventos: Evento[] = response.data[0].eventos; // Aqui definimos que eventos é um array de Evento
            const deliveredEvent = eventos.find((evento: Evento) => evento.descricaoEvento === 'Entregue'); // Agora 'evento' tem o tipo Evento

            if (deliveredEvent && order.status !== 'entregue') {
              const notification = {
                orderId: order._id,
                message: `Pedido ${order.nome} foi entregue.`,
                read: false
              };

              try {
                const notificationResponse = await axios.get(`${import.meta.env.REACT_APP_API_BASE_URL}/api/notifications/${order._id}`);

                if (notificationResponse.data) {
                  console.log('Notificação já existe para esse pedido');
                  continue;
                }
              } catch (error) {
                console.log('Criando nova notificação para pedido', order._id);
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/notifications`, notification);
              }

              updatedOrders[i] = { ...order, status: 'entregue' };

              setNotifications((prevNotifications) => {
                const isNotificationExist = prevNotifications.some((notif) => notif.orderId === notification.orderId);
                if (!isNotificationExist) {
                  return [...prevNotifications, notification];
                } else {
                  return prevNotifications;
                }
              });
            }
          } else {
            console.warn('Nenhum dado de rastreio encontrado:', order.codigoRastreio);
          }
        } catch (error) {
          console.error('Erro ao verificar status de entrega:', error);
        }
      }
    }

    setOrders(updatedOrders);
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  useEffect(() => {
    fetchNotifications(); // Busca notificações ao carregar a página
    checkDeliveryStatus(); // Chama a função imediatamente ao carregar a página

    const interval = setInterval(() => {
      checkDeliveryStatus(); // Chama a função a cada 30 minutos
    }, 30 * 60 * 1000); // 30 minutos em milissegundos

    return () => clearInterval(interval); 
  }, []); 

  const markAsRead = async (orderId: string) => {
    try {
      console.log("Order ID sendo enviado para a API:", orderId);
  
      // Requisição para marcar como lida utilizando o orderId (assumindo que seja um ObjectId válido)
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/notifications/${orderId}`,
        { read: true }
      );
  
      // Atualização local das notificações, comparando pelo orderId
      setNotifications(prev => 
        prev.map(notification => {
          const notificationWithOrderId = notification as Notification & { orderId: string };
          return notificationWithOrderId.orderId === orderId
            ? { ...notificationWithOrderId, read: true }
            : notification;
        })
      );
  
      console.log("Notificação marcada como lida:", response.data);
    } catch (error) {
      console.error("Erro ao tentar marcar a notificação como lida:", error);
    }
  };
  
  
  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'nao_pago':
        return 'text-red-500';
      case 'pago':
        return 'text-green-500';
      case 'agendado':
        return 'text-blue-500';
      case 'pre_postagem':
        return 'text-blue-400';
      case 'retirar':
        return 'text-yellow-500';
      case 'postado':
        return 'text-cyan-500';
      case 'entregue':
        return 'text-green-400';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <img src={logo} alt="Logo" className="mx-auto h-40" />
        </div>
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold">Notificações</h2>
          <div className="mt-4">
            {Array.isArray(notifications) && notifications.map(notification => (
              <div key={notification.orderId} className={`p-2 ${notification.read ? 'bg-gray-700' : 'bg-yellow-500'} rounded-md mb-2`}>
                <p>{notification.message}</p>
                <button onClick={() => markAsRead(notification.orderId)} className="text-blue-500">Marcar como lido</button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Nome</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">CPF</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Valor</label>
              <input
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Unidades</label>
              <input
                type="number"
                value={formData.unidades}
                onChange={(e) => setFormData({ ...formData, unidades: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Endereço</label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Código de Rastreio</label>
              <input
                type="text"
                value={formData.codigoRastreio}
                onChange={(e) => setFormData({ ...formData, codigoRastreio: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Data</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="nao_pago">Não Pago</option>
                <option value="pago">Pago</option>
                <option value="agendado">Agendado</option>
                <option value="pre_postagem">Pré Postagem</option>
                <option value="retirar">Retirar</option>
                <option value="postado">Postado</option>
                <option value="entregue">Entregue</option>
              </select>
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                {isEditing ? 'Atualizar Pedido' : 'Cadastrar Pedido'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Filtrar Pedidos</h2>
          <div className="flex gap-4 mb-6">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Selecione Status</option>
              <option value="nao_pago">Não Pago</option>
              <option value="pago">Pago</option>
              <option value="agendado">Agendado</option>
              <option value="pre_postagem">Pré Postagem</option>
              <option value="retirar">Retirar</option>
              <option value="postado">Postado</option>
              <option value="entregue">Entregue</option>
            </select>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Buscar por nome"
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Unidades</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {order.codigoRastreio && (
                          <Package
                            className="w-4 h-4 cursor-pointer text-blue-400 hover:text-blue-600"
                            onClick={() => fetchTrackingInfo(order.codigoRastreio, order._id)}
                          />
                        )}
                        <span>{order.nome}</span>
                        <MapPin
                          className="w-4 h-4 cursor-pointer text-gray-400 hover:text-gray-200"
                          onClick={() => setSelectedAddress(order.endereco)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{order.telefone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{order.unidades}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(order.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusClass(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' ')}
                          {order.status === 'entregue' && <Check className="inline-block ml-2 text-green-500" />}
                        </span>
                      </td>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(order)}
                        className="text-blue-600 hover:text-blue-400"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(order._id)}
                        className="text-red-600 hover:text-red-400 ml-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isTrackingOpen && trackingInfo.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Informações de Rastreio</h3>
                  <button
                    onClick={() => setIsTrackingOpen(false)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  {trackingInfo.map((event, index) => (
                    <div key={index} className="border-b pb-4">
                      <p className="font-medium">{event.descricao}</p>
                      <p className="text-sm text-gray-400">
                        {event.municipio} - {event.data}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedAddress && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Endereço</h3>
                  <button
                    onClick={() => setSelectedAddress(null)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-gray-300">{selectedAddress}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;