/**
 * @fileoverview Stores Zustand pour la gestion d'état global de l'application
 *
 * Ce module contient trois stores principaux:
 * - {@link useAuthStore} - Gestion de l'authentification et du profil utilisateur
 * - {@link useTeamStore} - Équipe actuellement sélectionnée
 * - {@link useUIStore} - État de l'interface utilisateur (modals, etc.)
 *
 * @module lib/store
 * @see https://docs.pmnd.rs/zustand/getting-started/introduction
 */

import { create } from 'zustand';
import { User as AppUser, Team } from '@/types/database';

/**
 * Utilisateur authentifié (informations de base)
 */
interface AuthUser {
  id: string;
  email: string;
}

/**
 * Interface définissant l'état et les actions du store d'authentification
 */
interface AuthState {
  /** Utilisateur authentifié (ID et email) */
  user: AuthUser | null;
  /** Profil utilisateur enrichi depuis la table 'users' */
  profile: AppUser | null;
  /** Indique si une opération d'auth est en cours */
  isLoading: boolean;
  /** Indique si le store a été initialisé (session récupérée) */
  isInitialized: boolean;

  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  /** Remet le store à zéro (utilisé lors du logout) */
  reset: () => void;
}

/**
 * Store Zustand pour l'authentification
 *
 * Gère l'état de connexion de l'utilisateur et son profil.
 * Synchronisé avec l'API backend via le hook useAuth.
 *
 * @example
 * ```tsx
 * const { user, profile, isLoading } = useAuthStore();
 *
 * if (isLoading) return <LoadingScreen />;
 * if (!user) return <LoginScreen />;
 * return <HomeScreen user={profile} />;
 * ```
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  reset: () => set({
    user: null,
    profile: null,
    isLoading: false,
  }),
}));

/**
 * Interface définissant l'état du store d'équipe
 */
interface TeamState {
  /** L'équipe actuellement sélectionnée/visualisée */
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
}

/**
 * Store Zustand pour l'équipe active
 *
 * Stocke l'équipe actuellement sélectionnée pour un accès rapide
 * dans les différents écrans sans avoir à la re-fetch.
 *
 * @example
 * ```tsx
 * const { currentTeam, setCurrentTeam } = useTeamStore();
 * ```
 */
export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  setCurrentTeam: (currentTeam) => set({ currentTeam }),
}));

/**
 * Interface définissant l'état UI global
 */
interface UIState {
  /** Modal d'ajout d'amende ouverte? */
  isAddFineModalOpen: boolean;
  /** ID du membre pré-sélectionné pour l'amende */
  selectedMemberId: string | null;

  openAddFineModal: (memberId?: string) => void;
  closeAddFineModal: () => void;
}

/**
 * Store Zustand pour l'état de l'interface utilisateur
 *
 * Gère les états UI globaux comme les modals qui peuvent
 * être déclenchés depuis plusieurs endroits de l'app.
 *
 * @example
 * ```tsx
 * const { openAddFineModal } = useUIStore();
 *
 * // Ouvrir le modal avec un membre pré-sélectionné
 * openAddFineModal(memberId);
 * ```
 */
export const useUIStore = create<UIState>((set) => ({
  isAddFineModalOpen: false,
  selectedMemberId: null,

  openAddFineModal: (memberId) => set({
    isAddFineModalOpen: true,
    selectedMemberId: memberId || null,
  }),
  closeAddFineModal: () => set({
    isAddFineModalOpen: false,
    selectedMemberId: null,
  }),
}));
