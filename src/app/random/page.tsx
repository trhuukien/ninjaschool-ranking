import { getCurrentAdmin } from "@/lib/auth/session";
import { listMemberCards } from "@/lib/members";
import { TeamRandomizer } from "./TeamRandomizer";

export const dynamic = "force-dynamic";

export default async function RandomTeamsPage() {
  const [members, admin] = await Promise.all([listMemberCards(), getCurrentAdmin()]);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">Chia phe</h1>
        <p className="mt-1 text-sm text-muted">
          Chọn phe rồi quay để bốc một người từ danh sách vào phe đó. Có thể xếp trước ai vào phe nào, hoặc chia nhanh
          phần còn lại. Chia xong bấm Đấu!
        </p>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted">Chưa có thành viên nào.</p>
      ) : (
        <TeamRandomizer members={members} isAdmin={admin !== null} />
      )}
    </div>
  );
}
