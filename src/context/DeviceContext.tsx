import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

type DeviceType = 'buyer' | 'seller' | null

interface DeviceContextType {
  deviceType: DeviceType
  setDeviceType: (type: DeviceType) => void
  phoneNumber: string
  setPhoneNumber: (phone: string) => void
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined)

export function DeviceProvider({ children }: { children: ReactNode }) {
  // Initialize device type from localStorage or URL parameter
  const [deviceType, setDeviceTypeState] = useState<DeviceType>(() => {
    // Check URL parameter first
    const params = new URLSearchParams(window.location.search)
    const deviceParam = params.get('device')
    if (deviceParam === 'buyer' || deviceParam === 'seller') {
      return deviceParam
    }
    
    // Check localStorage
    const stored = localStorage.getItem('device_type')
    if (stored === 'buyer' || stored === 'seller') {
      return stored
    }
    
    return null
  })

  // Initialize phone number from localStorage
  const [phoneNumber, setPhoneNumberState] = useState<string>(() => {
    const stored = localStorage.getItem('phone_number')
    return stored || ''
  })

  const setDeviceType = (type: DeviceType) => {
    setDeviceTypeState(type)
    if (type) {
      localStorage.setItem('device_type', type)
    } else {
      localStorage.removeItem('device_type')
    }
  }

  const setPhoneNumber = (phone: string) => {
    setPhoneNumberState(phone)
    localStorage.setItem('phone_number', phone)
  }

  // Update device type from URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const deviceParam = params.get('device')
    if (deviceParam === 'buyer' || deviceParam === 'seller') {
      setDeviceType(deviceParam)
    }
  }, [])

  return (
    <DeviceContext.Provider value={{ deviceType, setDeviceType, phoneNumber, setPhoneNumber }}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice() {
  const context = useContext(DeviceContext)
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider')
  }
  return context
}

