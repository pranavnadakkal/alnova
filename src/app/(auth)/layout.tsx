export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side — form content */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fafafa]">
        {children}
      </div>

      {/* Right side — decorative geometric panel */}
      <div className="hidden lg:block w-[480px] xl:w-[540px] relative overflow-hidden bg-[#4361ee]">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ background: '#0b1d51' }}
              />
              <div
                className="absolute w-[200%] h-[200%] rounded-full"
                style={{
                  background: '#4361ee',
                  bottom: '0',
                  right: '0',
                  transform: 'translate(50%, 50%)',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
