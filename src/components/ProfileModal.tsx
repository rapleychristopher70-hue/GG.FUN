import React, { useState } from 'react';
import { PlayerProfile } from '../types';
import { savePlayerProfile } from '../utils/storage';
import { sound } from '../utils/audio';
import { X, Award, Flame, Trophy, Shield, Volume2, VolumeX, Check } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

const AVATARS = ['🎮', '⚡', '👑', '🚀', '🔥', '👾', '🎯', '🦊', '💎', '♟️', '🦁', '⭐'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    const updated: PlayerProfile = {
      ...profile,
      name: name.trim(),
      avatar,
    };
    onUpdateProfile(updated);
    savePlayerProfile(updated);
    sound.playClick();
    onClose();
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Gamer Profile &amp; Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono">GLOBAL ELO</div>
            <div className="text-base font-mono font-bold text-indigo-400 mt-0.5">{profile.elo}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono">RECORD</div>
            <div className="text-base font-mono font-bold text-slate-200 mt-0.5">
              {profile.wins}W - {profile.losses}L
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono">STREAK</div>
            <div className="text-base font-mono font-bold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4" /> {profile.streak}
            </div>
          </div>
        </div>

        {/* Name Input */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Gamer Tag:
          </label>
          <input
            type="text"
            maxLength={18}
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Avatar Picker */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Choose Avatar:
          </label>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map(av => (
              <button
                key={av}
                onClick={() => setAvatar(av)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-transform ${
                  avatar === av
                    ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-105'
                    : 'bg-slate-950 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>Game Sound Effects</span>
          </div>
          <button
            onClick={toggleSound}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              !isMuted ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {!isMuted ? 'ENABLED' : 'MUTED'}
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
