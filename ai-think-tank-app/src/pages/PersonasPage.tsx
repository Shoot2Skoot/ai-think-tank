import React, { useEffect, useState } from 'react'
import { Search, Filter, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { usePersonaStore, getFilteredTemplates, getCategories } from '@/stores/persona-store'
import { getProviderColor, getExperienceColor, getAttitudeColor } from '@/lib/utils'

export const PersonasPage: React.FC = () => {
  const {
    templates,
    loadTemplates,
    searchQuery,
    searchTemplates,
    selectedCategory,
    filterByCategory
  } = usePersonaStore()

  const filteredTemplates = getFilteredTemplates(usePersonaStore.getState())
  const categories = getCategories(usePersonaStore.getState())

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Persona Library</h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Browse and manage AI personas for your conversations
            </p>
          </div>
          <Button className="mt-4 sm:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Create Custom Persona
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search personas..."
              value={searchQuery}
              onChange={(e) => searchTemplates(e.target.value)}
              icon={<Search className="h-4 w-4 text-text-tertiary" />}
            />
          </div>
          <Select
            value={selectedCategory || ''}
            onChange={(e) => filterByCategory(e.target.value || null)}
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat, label: cat }))
            ]}
          />
        </div>

        {/* Persona Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((persona) => (
            <Card key={persona.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{persona.name}</CardTitle>
                    <CardDescription>{persona.role}</CardDescription>
                  </div>
                  {persona.is_premium && (
                    <Badge variant="warning" size="sm">Premium</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {persona.description && (
                  <p className="text-sm text-text-secondary">{persona.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Provider</span>
                    <Badge className={getProviderColor(persona.default_provider)} size="sm">
                      {persona.default_provider}
                    </Badge>
                  </div>

                  {persona.experience_level && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-tertiary">Experience</span>
                      <span className={getExperienceColor(persona.experience_level)}>
                        {persona.experience_level}
                      </span>
                    </div>
                  )}

                  {persona.attitude && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-tertiary">Attitude</span>
                      <span className={getAttitudeColor(persona.attitude)}>
                        {persona.attitude}
                      </span>
                    </div>
                  )}
                </div>

                {persona.expertise_areas && persona.expertise_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {persona.expertise_areas.slice(0, 3).map((area, index) => (
                      <Badge key={index} variant="default" size="sm">
                        {area}
                      </Badge>
                    ))}
                    {persona.expertise_areas.length > 3 && (
                      <Badge variant="default" size="sm">
                        +{persona.expertise_areas.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2 text-sm text-text-tertiary">
                    <span>Used {persona.usage_count} times</span>
                    {persona.rating && (
                      <>
                        <span>•</span>
                        <span>★ {persona.rating.toFixed(1)}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-text-tertiary">No personas found matching your search.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}