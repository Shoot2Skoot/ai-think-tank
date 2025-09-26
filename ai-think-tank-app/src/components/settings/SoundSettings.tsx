import React, { useState, useEffect } from 'react'
import { soundManager } from '@/lib/soundManager'
import { Card } from '@/components/ui/Card'
import { Slider } from '@/components/ui/Slider'
import { Button } from '@/components/ui/Button'
import { Volume2, VolumeX, Play } from 'lucide-react'

export const SoundSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(soundManager.isEnabled())
  const [volume, setVolume] = useState(soundManager.getVolume())

  useEffect(() => {
    setEnabled(soundManager.isEnabled())
    setVolume(soundManager.getVolume())
  }, [])

  const handleToggleEnabled = () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    soundManager.setEnabled(newEnabled)
  }

  const handleVolumeChange = (value: number) => {
    setVolume(value)
    soundManager.setVolume(value)
  }

  const testSound = (soundName: string) => {
    soundManager.testSound(soundName)
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sound Effects</h3>
          <Button
            onClick={handleToggleEnabled}
            variant={enabled ? 'default' : 'outline'}
            size="sm"
          >
            {enabled ? (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Enabled
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 mr-2" />
                Disabled
              </>
            )}
          </Button>
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Volume</label>
              <div className="flex items-center gap-4">
                <VolumeX className="w-4 h-4 text-gray-500" />
                <Slider
                  value={volume}
                  onChange={handleVolumeChange}
                  min={0}
                  max={1}
                  step={0.1}
                  className="flex-1"
                />
                <Volume2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 w-10">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Test Sounds</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => testSound('message-send')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Play className="w-3 h-3 mr-2" />
                  Message Send
                </Button>
                <Button
                  onClick={() => testSound('message-receive')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Play className="w-3 h-3 mr-2" />
                  Message Receive
                </Button>
                <Button
                  onClick={() => testSound('mention')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Play className="w-3 h-3 mr-2" />
                  @Mention
                </Button>
                <Button
                  onClick={() => testSound('reaction')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Play className="w-3 h-3 mr-2" />
                  Reaction
                </Button>
                <Button
                  onClick={() => testSound('user-join')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Play className="w-3 h-3 mr-2" />
                  User Join
                </Button>
                <Button
                  onClick={() => testSound('user-leave')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Play className="w-3 h-3 mr-2" />
                  User Leave
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>• Message receive sounds only play when window is not focused</p>
              <p>• @Mention sounds always play to ensure you don't miss important messages</p>
              <p>• Anti-spam protection prevents sound fatigue</p>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}