// Export the Edge Function-based provider manager as the default
export { providerManager } from './provider-manager-edge'
export { MockLangChainProvider } from './mock-provider'

// Export the original provider-manager for reference if needed
export { ProviderManager as LegacyProviderManager } from './provider-manager'