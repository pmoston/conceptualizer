export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1e3b]">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/brand/dataciders_primär_dunkel.svg" alt="Dataciders" className="h-10 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1c1e3b]">Conceptualizer</h1>
        </div>
        {error && (
          <p className="mb-4 text-sm text-red-600 text-center">Incorrect password. Please try again.</p>
        )}
        <form action="/api/auth/login" method="POST" className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
          />
          <button
            type="submit"
            className="w-full bg-[#b3cc26] text-[#1c1e3b] font-semibold rounded-lg py-2.5 text-sm hover:brightness-105 transition"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
