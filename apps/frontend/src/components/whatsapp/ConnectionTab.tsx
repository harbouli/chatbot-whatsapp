import { useState } from 'react';
import { Wifi, Loader, WifiOff, QrCode, RefreshCw, X, MessageSquare, ToggleRight, ToggleLeft } from 'lucide-react';

import { useWhatsAppStatus, useAgentSettings, useToggleAutoRespond, useConnect, usePairingCode, useDisconnect } from '../../hooks/useWhatsApp';

export default function ConnectionTab() {
    const { data: status, refetch: fetchStatus, isLoading: statusLoading } = useWhatsAppStatus();
    const { data: agentSettings } = useAgentSettings();
    const toggleAutoRespond = useToggleAutoRespond();
    const connect = useConnect();
    const pair = usePairingCode();
    const disconnect = useDisconnect();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);

    const handleConnect = async () => {
        setLoadingAction(true);
        setError(null);
        try {
            await connect.mutateAsync();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to connect');
        } finally {
            setLoadingAction(false);
        }
    };

    const handlePairingCode = async () => {
        if (!phoneNumber.trim()) {
            setError('Please enter a phone number');
            return;
        }
        setLoadingAction(true);
        setError(null);
        try {
            const code = await pair.mutateAsync(phoneNumber.replace(/[^0-9]/g, ''));
            setPairingCode(code);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to get pairing code');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleDisconnect = async () => {
        setLoadingAction(true);
        setError(null);
        try {
            await disconnect.mutateAsync();
            setPairingCode(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to disconnect');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleToggleAutoRespond = () => {
        if (agentSettings) {
            toggleAutoRespond.mutate(!agentSettings.autoRespond);
        }
    };

    if (statusLoading || !status) {
        return (
            <div className="flex justify-center py-12">
                <Loader className="animate-spin text-brand-yellow" size={32} />
            </div>
        );
    }

    return (
        <div>
            {/* Header removed for new layout */}

            {/* Status Card */}
            {/* Status Card */}
            <div className={`rounded-2xl p-6 mb-6 border transition-all duration-500 ${status.status === 'connected'
                ? 'bg-white border-[#f6cb6e] shadow-sm'
                : status.status === 'connecting'
                    ? 'bg-white border-yellow-500 shadow-sm'
                    : 'bg-white border-gray-100 shadow-sm'
                }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${status.status === 'connected'
                        ? 'bg-[#f6cb6e] shadow-lg shadow-[#f6cb6e]/20'
                        : status.status === 'connecting'
                            ? 'bg-yellow-500 shadow-lg shadow-yellow-500/20'
                            : 'bg-gray-100 shadow-lg shadow-gray-200'
                        }`}>
                        {status.status === 'connected' ? (
                            <Wifi className="text-[#090c19]" size={24} />
                        ) : status.status === 'connecting' ? (
                            <Loader className="text-white animate-spin" size={24} />
                        ) : (
                            <WifiOff className="text-gray-400" size={24} />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-[#090c19] capitalize">{status.status}</h3>
                        <p className="text-sm text-gray-500">
                            {status.status === 'connected' && status.phoneNumber
                                ? `+${status.phoneNumber}`
                                : status.status === 'connecting'
                                    ? 'Waiting for connection...'
                                    : 'Not connected'
                            }
                        </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${status.status === 'connected' ? 'bg-[#f6cb6e]'
                        : status.status === 'connecting' ? 'bg-yellow-500'
                            : 'bg-gray-300'
                        }`} />
                </div>
            </div>

            {/* QR Code / Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                {error && (
                    <div className="mb-4 p-4 bg-[#b24545]/10 border border-[#b24545]/20 rounded-xl text-[#b24545] text-sm">
                        {error}
                    </div>
                )}

                {status.status === 'connecting' && status.qrCode && (
                    <div className="text-center mb-6">
                        <p className="text-gray-500 mb-4">Scan this QR code with WhatsApp</p>
                        <div className="inline-block p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                            <img src={status.qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                    </div>
                )}

                {pairingCode && (
                    <div className="text-center mb-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
                        <p className="text-gray-500 mb-2">Enter this code in WhatsApp</p>
                        <p className="text-4xl font-mono font-bold text-purple-600 tracking-widest">{pairingCode}</p>
                    </div>
                )}

                {status.status === 'disconnected' && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number (with country code)</label>
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="212612345678"
                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f6cb6e] focus:border-transparent outline-none text-[#090c19]"
                            />
                            <button
                                onClick={handlePairingCode}
                                disabled={loadingAction}
                                className="px-5 py-3 bg-[#090c19] hover:bg-gray-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                Get Code
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {status.status === 'disconnected' && (
                        <button
                            onClick={handleConnect}
                            disabled={loadingAction}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#f6cb6e] hover:bg-[#edd08c] text-[#090c19] rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 transform hover:scale-[1.02] shadow-lg shadow-[#f6cb6e]/20"
                        >
                            {loadingAction ? <Loader size={18} className="animate-spin" /> : <QrCode size={18} />}
                            Connect with QR
                        </button>
                    )}
                    {status.status === 'connecting' && (
                        <button
                            onClick={() => fetchStatus()}
                            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                        >
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                    )}
                    {status.status === 'connected' && (
                        <button
                            onClick={handleDisconnect}
                            disabled={loadingAction}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#b24545] hover:bg-[#a13d3d] text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#b24545]/20"
                        >
                            {loadingAction ? <Loader size={18} className="animate-spin" /> : <X size={18} />}
                            Disconnect
                        </button>
                    )}
                </div>
            </div>

            {/* Auto-Respond Toggle */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${agentSettings?.autoRespond
                            ? 'bg-[#f6cb6e] shadow-lg shadow-[#f6cb6e]/20'
                            : 'bg-gray-100'
                            }`}>
                            <MessageSquare className={agentSettings?.autoRespond ? 'text-[#090c19]' : 'text-gray-400'} size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#090c19]">Auto-Respond</h3>
                            <p className="text-sm text-gray-500">
                                {agentSettings?.autoRespond ? 'AI is responding automatically' : 'Auto-respond disabled'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleAutoRespond}
                        className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${agentSettings?.autoRespond
                            ? 'bg-[#f6cb6e] text-[#090c19] shadow-lg shadow-[#f6cb6e]/20'
                            : 'bg-gray-100 text-gray-400'
                            }`}
                    >
                        {agentSettings?.autoRespond ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
