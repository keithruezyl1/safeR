import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useDevice } from '../context/DeviceContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { balance, deviceType } = useWallet()
  const { setDeviceType, phoneNumber, setPhoneNumber } = useDevice()
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [phoneInput, setPhoneInput] = useState(phoneNumber)

  const services = [
    { name: 'Send', icon: '📤' },
    { name: 'Load', icon: '📱' },
    { name: 'Transfer', icon: '🏦' },
    { name: 'Bills', icon: '📄' },
    { name: 'Borrow', icon: '🤝' },
    { name: 'GSave', icon: '🐷' },
    { name: 'Ginsure', icon: '🛡️' },
    { name: 'GInvest', icon: '🌱' },
    { name: 'GLife', icon: '🛒' },
    { name: 'A+ Rewards', icon: '🎁' },
    { name: 'GForest', icon: '🌿' },
    { name: 'GAssure', icon: '🔒' },
  ]

  const handleServiceClick = (serviceName: string) => {
    if (serviceName === 'GAssure') {
      navigate('/escrow')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="text-sm font-semibold text-black">9:41</span>
        <div className="flex items-center gap-1">
          <div className="h-1 w-4 rounded-sm bg-black"></div>
          <div className="h-1 w-4 rounded-sm bg-black"></div>
          <div className="h-1 w-4 rounded-sm bg-black"></div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between bg-[#0066FF] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
            <span className="text-lg font-bold text-[#0066FF]">G</span>
          </div>
          <span className="text-base font-semibold text-white">Hello!</span>
        </div>
        <div className="flex items-center gap-2">
          {!deviceType && (
            <div className="flex gap-1">
              <button
                onClick={() => setDeviceType('buyer')}
                className="rounded bg-white/20 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/30"
              >
                Buyer
              </button>
              <button
                onClick={() => setDeviceType('seller')}
                className="rounded bg-white/20 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/30"
              >
                Seller
              </button>
            </div>
          )}
          {deviceType && (
            <span className="rounded bg-white/20 px-2 py-1 text-[10px] font-semibold text-white capitalize">
              {deviceType}
            </span>
          )}
          <button className="rounded bg-white/20 px-3 py-1 text-xs font-semibold text-white">
            HELP
          </button>
        </div>
      </div>

      {/* Phone Number Section */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-600">Phone Number</span>
            {phoneNumber ? (
              <span className="text-sm font-semibold text-gray-800">{phoneNumber}</span>
            ) : (
              <span className="text-xs text-gray-500">Not set</span>
            )}
          </div>
          <button
            onClick={() => {
              setPhoneInput(phoneNumber)
              setShowPhoneInput(!showPhoneInput)
            }}
            className="rounded-lg bg-[#0066FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0052CC]"
          >
            {phoneNumber ? 'Edit' : 'Set'}
          </button>
        </div>
        {showPhoneInput && (
          <div className="mt-3 flex gap-2">
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+63 912 345 6789"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
            />
            <button
              onClick={() => {
                if (phoneInput.trim()) {
                  setPhoneNumber(phoneInput.trim())
                  setShowPhoneInput(false)
                }
              }}
              className="rounded-lg bg-[#10B981] px-4 py-2 text-xs font-semibold text-white hover:bg-[#059669]"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowPhoneInput(false)
                setPhoneInput(phoneNumber)
              }}
              className="rounded-lg bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Available Balance Section */}
      <div className="bg-[#0066FF] px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/90">
              Available Balance
            </span>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="text-white"
            >
              {balanceVisible ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
        <div className="mb-4">
          {balanceVisible ? (
            <p className="text-4xl font-bold text-white">
              ₱ {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ) : (
            <p className="text-4xl font-bold text-white">••••••</p>
          )}
        </div>
        <div className="flex justify-end">
          <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0066FF]">
            <span className="text-lg">+</span>
            Cash In
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-4 gap-4">
          {services.map((service) => (
            <button
              key={service.name}
              onClick={() => handleServiceClick(service.name)}
              className="relative flex flex-col items-center gap-2 rounded-lg p-3 transition hover:bg-gray-50"
            >
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0066FF]/10 text-2xl">
                {service.icon}
                {service.name === 'GAssure' && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    New
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700">{service.name}</span>
            </button>
          ))}
        </div>

        {/* View All Services */}
        <div className="mt-6 text-center">
          <button className="text-sm font-semibold text-[#0066FF]">View All Services</button>
        </div>
      </div>

      {/* GCash Exclusives */}
      <div className="px-4 pb-20">
        <h3 className="mb-3 text-base font-bold text-black">GCash Exclusives</h3>
        <div className="relative overflow-hidden rounded-2xl bg-[#0066FF] p-6">
          <div className="relative z-10">
            <p className="text-2xl font-bold text-white">Life is</p>
            <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-bold text-[#0066FF]">G</span>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-32 bg-white/10"></div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-around px-4 py-3">
          <button className="flex flex-col items-center gap-1">
            <div className="h-6 w-6 rounded bg-[#0066FF]"></div>
            <span className="text-xs font-medium text-[#0066FF]">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="h-6 w-6 rounded border-2 border-gray-400"></div>
            <span className="text-xs font-medium text-gray-500">Inbox</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0066FF]">
              <div className="h-6 w-6 rounded border-2 border-white"></div>
            </div>
            <span className="text-xs font-medium text-[#0066FF]">QR</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="h-6 w-6 rounded border-2 border-gray-400"></div>
            <span className="text-xs font-medium text-gray-500">Transactions</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <div className="h-6 w-6 rounded-full border-2 border-gray-400"></div>
            <span className="text-xs font-medium text-gray-500">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}

