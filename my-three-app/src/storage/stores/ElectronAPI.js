// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI

const browserMock = {
  saveProgress: (data) => {
    localStorage.setItem('playerProgress', JSON.stringify(data))
    return Promise.resolve(true)
  },
  loadProgress: () => {
    const data = localStorage.getItem('playerProgress')
    return Promise.resolve(data ? JSON.parse(data) : null)
  }
}

export const saveProgress = (data) => {
  if (isElectron) {
    return window.electronAPI.saveProgress(data)
  } else {
    return browserMock.saveProgress(data)
  }
}

export const loadProgress = () => {
  if (isElectron) {
    return window.electronAPI.loadProgress()
  } else {
    return browserMock.loadProgress()
  }
}
