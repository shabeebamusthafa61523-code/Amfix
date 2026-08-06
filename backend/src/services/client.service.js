import Client from '../models/client.model.js';

export const generateClientId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `CLI-${currentYear}-`;
  
  // Find latest client created this year by clientId sequence
  const latestClient = await Client.findOne({ clientId: { $regex: `^${prefix}` } })
    .sort({ clientId: -1 })
    .exec();

  if (!latestClient || !latestClient.clientId) {
    return `${prefix}0001`;
  }

  const parts = latestClient.clientId.split('-');
  const seq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(seq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

export const fetchClientStats = async () => {
  const totalClients = await Client.countDocuments();
  const activeClients = await Client.countDocuments({ status: 'Active' });
  const enterpriseClients = await Client.countDocuments({ clientType: 'Enterprise' });
  const pendingNDAs = await Client.countDocuments({ ndaStatus: 'Pending' });

  const monthlyRevResult = await Client.aggregate([
    { $match: { status: 'Active' } },
    { $group: { _id: null, totalRevenue: { $sum: '$expectedMonthlyRevenue' } } }
  ]);

  const totalMonthlyRevenue = monthlyRevResult[0]?.totalRevenue || 0;

  return {
    totalClients,
    activeClients,
    enterpriseClients,
    pendingNDAs,
    totalMonthlyRevenue
  };
};
