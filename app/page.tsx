'use client';

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { AdUploadForm } from "@/components/ad-upload-form"
import { AdList } from "@/components/ad-list"
import { createClient } from '@/utils/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, LogOut } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setUserEmail(session?.user?.email || null)

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            setUserEmail(session?.user?.email || null)
            if (!session) {
              router.push('/login')
            }
          }
        )

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error getting session:', error)
        router.push('/login')
      }
    }

    getSession()
  }, [supabase, router])

  const handleUploadSuccess = () => {
    setRefreshSignal((prev) => prev + 1)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      router.push('/login')
    }
  }

  return (
    <main className="container w-full max-w-none">
      <div className="header items-center bg-black flex justify-between p-6">
        <div className="flex items-center gap-2">
          {/* <img className="w-28 h-2w-28" src="/svgs/pxl-logo.svg" alt="" /> */}
          <h1 className="text-3xl font-semibold text-white">Google Ad Gallery</h1>
        </div>
        
        {/* User Account Dropdown */}
        {userEmail && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 hover:bg-gray-300 duration-100 rounded-full">
                <User className="h-5 w-5 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 m-4 gap-6">
        <div className="bg-gray-200 max-h-fit sticky top-4 px-4 py-4 rounded-lg col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Upload New Ad</h2>
          <AdUploadForm onUploadSuccess={handleUploadSuccess} />
        </div>
        <div className="col-span-3">
          <h2 className="text-2xl font-semibold mb-4">Ad List</h2>
          <AdList refreshSignal={refreshSignal} />
        </div>
      </div>
    </main>
  )
}