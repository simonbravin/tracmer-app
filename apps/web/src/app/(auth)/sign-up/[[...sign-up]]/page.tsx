import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      forceRedirectUrl="/tablero"
      appearance={{
        elements: {
          rootBox: "w-full max-w-md",
        },
      }}
    />
  );
}
