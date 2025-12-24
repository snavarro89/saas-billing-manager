"use client"

import { signOut } from "next-auth/react"
import { Button } from "./Button"

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sign out
    </Button>
  )
}

