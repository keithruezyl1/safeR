import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useDevice } from './DeviceContext'

interface WalletContextType {
  balance: number
  setBalance: (balance: number) => void
  addBalance: (amount: number) => void
  subtractBalance: (amount: number) => void
  deviceType: 'buyer' | 'seller' | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { deviceType } = useDevice()
  
  // Get the appropriate localStorage key based on device type
  const getWalletKey = (type: 'buyer' | 'seller' | null) => {
    if (type === 'buyer') return 'wallet_balance_buyer'
    if (type === 'seller') return 'wallet_balance_seller'
    return 'wallet_balance' // fallback
  }

  // Get initial balance based on device type
  const getInitialBalance = (type: 'buyer' | 'seller' | null) => {
    if (type === 'buyer') return 10000.00
    if (type === 'seller') return 5000.00
    return 7500.00 // fallback
  }

  // Initialize balance from localStorage or default based on device type
  const [balance, setBalanceState] = useState<number>(() => {
    const key = getWalletKey(deviceType)
    const stored = localStorage.getItem(key)
    if (stored) {
      return parseFloat(stored)
    }
    return getInitialBalance(deviceType)
  })

  // Update balance when device type changes
  useEffect(() => {
    if (!deviceType) return
    
    const key = getWalletKey(deviceType)
    const stored = localStorage.getItem(key)
    if (stored) {
      const balanceValue = parseFloat(stored)
      setBalanceState(balanceValue)
    } else {
      // Initialize wallet if it doesn't exist with device-specific balance
      const initialBalance = getInitialBalance(deviceType)
      setBalanceState(initialBalance)
      localStorage.setItem(key, initialBalance.toString())
    }
  }, [deviceType])

  const setBalance = (newBalance: number) => {
    if (!deviceType) return
    setBalanceState(newBalance)
    const key = getWalletKey(deviceType)
    localStorage.setItem(key, newBalance.toString())
  }

  const addBalance = (amount: number) => {
    if (!deviceType) return
    setBalanceState((prev) => {
      const newBalance = prev + amount
      const currentKey = getWalletKey(deviceType)
      localStorage.setItem(currentKey, newBalance.toString())
      return newBalance
    })
  }

  const subtractBalance = (amount: number) => {
    if (!deviceType) return
    setBalanceState((prev) => {
      const newBalance = Math.max(0, prev - amount)
      const currentKey = getWalletKey(deviceType)
      localStorage.setItem(currentKey, newBalance.toString())
      return newBalance
    })
  }

  return (
    <WalletContext.Provider value={{ balance, setBalance, addBalance, subtractBalance, deviceType }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

