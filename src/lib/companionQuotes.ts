/**
 * Repository of 100+ Contextual Motivational Quotes for AI Study Companion (Lumi)
 * Grouped into 10 distinct psychological study scenarios:
 * 1. start (Bắt đầu - Vượt qua sức ỳ)
 * 2. flow (Đang tập trung - Giữ vững nhịp độ)
 * 3. endurance (Khi học lâu - Bền bỉ bền lòng)
 * 4. obstacle (Khi gặp khó - Tháo gỡ nút thắt)
 * 5. mistake (Khi trả lời sai - Học hỏi từ lỗi sai)
 * 6. micro_progress (Khi hoàn thành phần nhỏ - Ghi nhận từng bước)
 * 7. finishing (Khi gần hoàn thành - Tăng tốc về đích)
 * 8. victory (Khi hoàn thành - Tự hào thành quả)
 * 9. restart (Khi quay lại học - Chào đón ấm áp)
 * 10. surprise (Cá tính dễ thương bất ngờ của Lumi)
 */

export type QuoteCategory = 
  | 'start' 
  | 'flow' 
  | 'endurance' 
  | 'obstacle' 
  | 'mistake' 
  | 'micro_progress' 
  | 'finishing' 
  | 'victory' 
  | 'restart' 
  | 'surprise';

export interface MotivationalQuote {
  id: string;
  category: QuoteCategory;
  text: string;
  tag?: string;
}

export const MOTIVATIONAL_QUOTES_POOL: MotivationalQuote[] = [
  // -------------------------------------------------------------
  // Nhóm 1: Bắt đầu (Start / Vượt qua sức ỳ) - 12 câu
  // -------------------------------------------------------------
  { id: 'start_1', category: 'start', text: 'Chỉ cần bạn ngồi vào bàn học, bạn đã chiến thắng 50% sự trì hoãn rồi đó!' },
  { id: 'start_2', category: 'start', text: 'Không cần hoàn hảo ngay từ phút đầu, cứ bắt đầu với 5 phút nhẹ nhàng trước nhé.' },
  { id: 'start_3', category: 'start', text: 'Đừng nghĩ đến cả chặng đường dài. Chúng mình lo trang sách/từ vựng đầu tiên trước nào!' },
  { id: 'start_4', category: 'start', text: 'Bắt đầu luôn là bước khó nhất. Nhưng có Lumi ở đây, chúng mình làm được mà!' },
  { id: 'start_5', category: 'start', text: 'Hít sâu một hơi, thả lỏng vai ra nhé. Hành trình mới bắt đầu ngay bây giờ!' },
  { id: 'start_6', category: 'start', text: 'Chỉ 1 nhiệm vụ nhỏ trước mắt thôi. Một bước tiến nhỏ vẫn hơn là đứng yên.' },
  { id: 'start_7', category: 'start', text: 'Mở ứng dụng lên là đã tuyệt lắm rồi. Cùng nạp chút năng lượng nào!' },
  { id: 'start_8', category: 'start', text: 'Tâm trí chưa sẵn sàng 100% cũng không sao, hành động trước rồi cảm hứng sẽ đến sau!' },
  { id: 'start_9', category: 'start', text: 'Ngôi sao nhỏ của Lumi sáng nhất là khi thấy bạn bắt đầu nỗ lực đó!' },
  { id: 'start_10', category: 'start', text: 'Hôm nay học ít cũng được, học chậm cũng được, miễn là chúng mình có bắt đầu.' },
  { id: 'start_11', category: 'start', text: 'Tắt một tab mạng xã hội, mở một trang tri thức. Bạn đang làm chủ thời gian của mình!' },
  { id: 'start_12', category: 'start', text: 'Mọi cao thủ đều từng là người mới bắt đầu lúng túng. Tự tin lên bạn ơi!' },

  // -------------------------------------------------------------
  // Nhóm 2: Đang tập trung (Flow / Giữ vững nhịp độ) - 12 câu
  // -------------------------------------------------------------
  { id: 'flow_1', category: 'flow', text: 'Dòng chảy tập trung của bạn đang rất đẹp. Cứ thế lướt đi nhé!' },
  { id: 'flow_2', category: 'flow', text: 'Bạn đang làm tốt hơn bạn nghĩ đấy. Nhịp độ này cực kỳ chuẩn!' },
  { id: 'flow_3', category: 'flow', text: 'Thế giới ngoài kia cứ vội vã, còn ở đây chúng mình làm chủ từng khoảnh khắc.' },
  { id: 'flow_4', category: 'flow', text: 'Lumi đang đứng cạnh tiếp lửa cho bạn nè. Cứ thong thả mà chắc chắn nhé!' },
  { id: 'flow_5', category: 'flow', text: 'Một từ nữa thôi, một dòng code nữa thôi. Từng chút một tạo nên kỳ tích.' },
  { id: 'flow_6', category: 'flow', text: 'Sự tập trung lúc này là món quà quý giá nhất bạn đang tự tặng cho tương lai.' },
  { id: 'flow_7', category: 'flow', text: 'Ánh mắt kiên định của bạn trông thật đáng ngưỡng mộ!' },
  { id: 'flow_8', category: 'flow', text: 'Từng viên gạch tri thức đang được xếp ngay ngắn vào bộ não thiên tài của bạn.' },
  { id: 'flow_9', category: 'flow', text: 'Giữ lưng thẳng một xíu nào! Tư thế tốt giúp não nạp oxy nhanh hơn đó.' },
  { id: 'flow_10', category: 'flow', text: 'Cảm giác đắm chìm vào công việc thật tuyệt vời phải không bạn?' },
  { id: 'flow_11', category: 'flow', text: 'Mọi phiền nhiễu xung quanh đều vô hiệu trước sự tập trung của bạn lúc này.' },
  { id: 'flow_12', category: 'flow', text: 'Tiến độ đang tăng đều đặn. Mình rất thích cách bạn kiên định như thế này!' },

  // -------------------------------------------------------------
  // Nhóm 3: Khi học lâu (Endurance / Bền bỉ dài hơi) - 12 câu
  // -------------------------------------------------------------
  { id: 'endurance_1', category: 'endurance', text: 'Bạn đã ngồi học một quãng thời gian dài rồi đó! Uống một ngụm nước ấm nhé.' },
  { id: 'endurance_2', category: 'endurance', text: 'Chớp mắt vài cái và nhìn ra xa 20 giây nào, mắt bạn xứng đáng được yêu thương!' },
  { id: 'endurance_3', category: 'endurance', text: 'Sức bền của bạn thật đáng khâm phục. Bạn đang xây dựng nội lực rất vững chắc.' },
  { id: 'endurance_4', category: 'endurance', text: 'Nếu thấy mỏi vai, hãy xoay nhẹ cổ sang hai bên một chút nhé, Lumi đợi bạn.' },
  { id: 'endurance_5', category: 'endurance', text: 'Đường dài mới biết ngựa hay, và bạn đang chứng minh mình là một chiến binh cừ khôi!' },
  { id: 'endurance_6', category: 'endurance', text: 'Chậm cũng được, nghỉ tay một chút cũng được, nhưng đừng dừng lại hẳn nhé!' },
  { id: 'endurance_7', category: 'endurance', text: 'Bộ não hoạt động liên tục nãy giờ rồi. Bạn có thấy mình ngày càng nhạy bén hơn không?' },
  { id: 'endurance_8', category: 'endurance', text: 'Ngôi sao của Lumi đang phát sáng rực rỡ để tiếp thêm sinh lực cho bạn đây!' },
  { id: 'endurance_9', category: 'endurance', text: 'Kiên trì thêm một chút nữa thôi, thành quả ngọt ngào đang ở ngay khúc quanh phía trước.' },
  { id: 'endurance_10', category: 'endurance', text: 'Những người thành công nhất chính là những người tiếp tục khi người khác đã từ bỏ.' },
  { id: 'endurance_11', category: 'endurance', text: 'Cảm ơn bạn vì đã không bỏ cuộc hôm nay. Nỗ lực này của bạn có giá trị vô cùng.' },
  { id: 'endurance_12', category: 'endurance', text: 'Thở đều nào. Năng lượng tích cực đang bao bọc lấy không gian học của chúng mình.' },

  // -------------------------------------------------------------
  // Nhóm 4: Khi gặp khó (Obstacle / Tháo gỡ nút thắt) - 12 câu
  // -------------------------------------------------------------
  { id: 'obstacle_1', category: 'obstacle', text: 'Cảm thấy khó nghĩa là não bộ đang hình thành các liên kết nơ-ron mới đó!' },
  { id: 'obstacle_2', category: 'obstacle', text: 'Chỗ nào khó hiểu, chúng mình bẻ nhỏ nó ra làm 2 phần để giải quyết nhé.' },
  { id: 'obstacle_3', category: 'obstacle', text: 'Không ai hiểu ngay từ lần đọc đầu tiên cả. Đọc chậm lại một nhịp nào.' },
  { id: 'obstacle_4', category: 'obstacle', text: 'Bình tĩnh nào bạn ơi. Khó khăn chỉ là thử thách nhỏ để chứng minh độ giỏi của bạn thôi!' },
  { id: 'obstacle_5', category: 'obstacle', text: 'Nếu bị tắc ý, hãy hít thở sâu 3 giây rồi nhìn lại từ một góc độ khác xem sao.' },
  { id: 'obstacle_6', category: 'obstacle', text: 'Đừng tự trách mình nhé. Bạn đang học một thứ mới toanh mà, khó là chuyện hiển nhiên!' },
  { id: 'obstacle_7', category: 'obstacle', text: 'Lumi tin vào trí tuệ của bạn. Chúng mình cùng giải mã câu đố này nào!' },
  { id: 'obstacle_8', category: 'obstacle', text: 'Mọi bài toán hóc búa đều sẽ phải đầu hàng trước sự kiên nhẫn của bạn.' },
  { id: 'obstacle_9', category: 'obstacle', text: 'Thả lỏng trán ra nào, đừng nhíu mày nè. Cười một cái rồi thử lại cách khác nhé!' },
  { id: 'obstacle_10', category: 'obstacle', text: 'Bạn đã vượt qua bao nhiêu bài thi khó trong quá khứ rồi, lần này cũng vậy thôi!' },
  { id: 'obstacle_11', category: 'obstacle', text: 'Mỗi lần vướng mắc là một cơ hội vàng để hiểu sâu bản chất vấn đề.' },
  { id: 'obstacle_12', category: 'obstacle', text: 'Có Lumi ở cạnh giữ sao sáng cho bạn nè, bóng tối khó khăn sẽ tan biến ngay thôi!' },

  // -------------------------------------------------------------
  // Nhóm 5: Khi trả lời sai / chưa nhớ (Mistake / Growth Mindset) - 12 câu
  // -------------------------------------------------------------
  { id: 'mistake_1', category: 'mistake', text: 'Sai một câu không sao cả! Chính câu này sẽ là câu bạn nhớ lâu nhất về sau đó.' },
  { id: 'mistake_2', category: 'mistake', text: 'Lỗi sai chỉ là dữ liệu để hệ thống ghi nhớ của bạn điều chỉnh lại thôi nè!' },
  { id: 'mistake_3', category: 'mistake', text: 'Đừng nản nhé! Người thông minh không phải không bao giờ sai, mà là học được từ lỗi sai.' },
  { id: 'mistake_4', category: 'mistake', text: 'Lumi vừa cất từ này vào ngăn kéo ưu tiên rồi, lần tới gặp lại là bạn xử đẹp ngay!' },
  { id: 'mistake_5', category: 'mistake', text: 'Không có gì phải thất vọng cả. Thử thách này giúp bộ nhớ Spaced Repetition hoạt động tốt hơn!' },
  { id: 'mistake_6', category: 'mistake', text: 'Cười nhẹ một cái nào! Trả lời sai cũng là một bước tiến quan trọng trong học tập.' },
  { id: 'mistake_7', category: 'mistake', text: 'Nhìn kỹ lại đáp án đúng một lần nữa nhé, lần sau chúng mình sẽ làm nó bất ngờ!' },
  { id: 'mistake_8', category: 'mistake', text: 'Bạn dũng cảm chọn đáp án là đã rất tuyệt rồi. Chúng mình tiếp tục câu kế tiếp nào!' },
  { id: 'mistake_9', category: 'mistake', text: 'Quên là phản xạ tự nhiên của não, ôn lại là bí quyết của người dẫn đầu!' },
  { id: 'mistake_10', category: 'mistake', text: 'Lumi luôn ủng hộ bạn 100%, dù đúng hay sai thì bạn vẫn đang nỗ lực hết mình.' },
  { id: 'mistake_11', category: 'mistake', text: 'Mỗi cú vấp nhẹ là một lời nhắc để bước chân sau chắc chắn hơn.' },
  { id: 'mistake_12', category: 'mistake', text: 'Không sao hết nha! Làm lại một lần nữa với tâm thế nhẹ nhàng nào.' },

  // -------------------------------------------------------------
  // Nhóm 6: Hoàn thành phần nhỏ (Micro-progress / Tiến bộ từng chút) - 12 câu
  // -------------------------------------------------------------
  { id: 'micro_1', category: 'micro_progress', text: 'Woa! Vừa giải quyết xong một mục rồi nhé! Bạn thấy nhẹ nhõm hơn chưa?' },
  { id: 'micro_2', category: 'micro_progress', text: 'Một bước tiến đẹp mắt! Tích tiểu thành đại là có thật đó bạn ơi!' },
  { id: 'micro_3', category: 'micro_progress', text: 'Chuẩn chỉnh luôn! Phản xạ của bạn ngày càng sắc bén rồi đấy.' },
  { id: 'micro_4', category: 'micro_progress', text: 'Ngôi sao của Lumi vừa nhấp nháy chúc mừng bạn câu trả lời vừa rồi nè ⭐!' },
  { id: 'micro_5', category: 'micro_progress', text: 'Thấy chưa, bạn làm được mà! Cứ tự tin tiến lên mục tiếp theo nhé!' },
  { id: 'micro_6', category: 'micro_progress', text: 'Mỗi thẻ nhớ lật qua là một hạt giống tri thức được gieo mầm vững chắc.' },
  { id: 'micro_7', category: 'micro_progress', text: 'Tiến độ vừa nhảy thêm một nấc rồi, cảm giác chinh phục thật đã!' },
  { id: 'micro_8', category: 'micro_progress', text: 'Bạn đang xử lý mọi thứ cực kỳ mượt mà. Tiếp tục đà này nào!' },
  { id: 'micro_9', category: 'micro_progress', text: 'Tự vỗ vai khen mình một cái nha, bạn vừa làm được một điều rất cừ!' },
  { id: 'micro_10', category: 'micro_progress', text: 'Những tích lũy nhỏ hôm nay sẽ tạo nên bước nhảy vọt ngày mai đó.' },
  { id: 'micro_11', category: 'micro_progress', text: 'Từng câu đúng đang đưa bạn đến gần hơn với mục tiêu lớn rồi!' },
  { id: 'micro_12', category: 'micro_progress', text: 'Tuyệt cú mèo! Phong độ đang lên rất cao, giữ vững nhé bạn tôi!' },

  // -------------------------------------------------------------
  // Nhóm 7: Gần hoàn thành (Finishing Strong / Tăng tốc về đích) - 12 câu
  // -------------------------------------------------------------
  { id: 'finish_1', category: 'finishing', text: 'Sắp về đích rồi bạn ơi! Chỉ còn vài phút/vài câu cuối cùng thôi!' },
  { id: 'finish_2', category: 'finishing', text: 'Vạch đích đã ở ngay trước mắt! Dồn nốt năng lượng để chốt hạ phiên này nào!' },
  { id: 'finish_3', category: 'finishing', text: 'Đừng dừng lại lúc này nha, cảm giác chạm tay vào chiến thắng đang chờ bạn đấy!' },
  { id: 'finish_4', category: 'finishing', text: '90% chặng đường đã ở sau lưng. 10% còn lại là màn trình diễn ấn tượng nhất!' },
  { id: 'finish_5', category: 'finishing', text: 'Lumi đang đứng ở vạch đích vẫy cờ cổ vũ bạn hết mình nè 🚩!' },
  { id: 'finish_6', category: 'finishing', text: 'Chỉ một chút nữa thôi, bạn sắp có một phiên học điểm 10 trọn vẹn!' },
  { id: 'finish_7', category: 'finishing', text: 'Tập trung cao độ cho chặng nước rút nào! Bạn sắp hoàn thành xuất sắc rồi!' },
  { id: 'finish_8', category: 'finishing', text: 'Mùi vị của sự hoàn thành đang đến rất gần, ngọt ngào lắm đấy!' },
  { id: 'finish_9', category: 'finishing', text: 'Giữ vững nhịp thở, từng câu cuối cùng này sẽ khép lại một phiên học mỹ mãn.' },
  { id: 'finish_10', category: 'finishing', text: 'Bạn đã đi được một quãng đường dài không tưởng. Tự hào về bạn quá!' },
  { id: 'finish_11', category: 'finishing', text: 'Đếm ngược từng giây/từng từ nào! 3... 2... 1... sắp xong rồi!' },
  { id: 'finish_12', category: 'finishing', text: 'Khóa chặt sự tập trung cho những nốt nhạc cuối cùng của bài học nào!' },

  // -------------------------------------------------------------
  // Nhóm 8: Hoàn thành (Victory / Tự hào thành quả) - 12 câu
  // -------------------------------------------------------------
  { id: 'vic_1', category: 'victory', text: 'BÙM! 🎉 Hoàn thành xuất sắc! Bạn là một chiến binh thực thụ hôm nay!' },
  { id: 'vic_2', category: 'victory', text: 'Chúc mừng bạn! Cảm giác hoàn thành mục tiêu thật là sảng khoái đúng không?' },
  { id: 'vic_3', category: 'victory', text: 'Lumi tặng bạn một tràng pháo tay siêu to khổng lồ 👏👏👏! Làm tốt lắm!' },
  { id: 'vic_4', category: 'victory', text: 'Tất cả nỗ lực nãy giờ đã được đền đáp xứng đáng. Tự hào về bạn 3000 lần!' },
  { id: 'vic_5', category: 'victory', text: 'Hôm nay bạn đã vượt lên trên chính mình ngày hôm qua rồi đó!' },
  { id: 'vic_6', category: 'victory', text: 'Nghỉ ngơi thật đã nào! Bạn hoàn toàn xứng đáng được thư giãn thả ga.' },
  { id: 'vic_7', category: 'victory', text: 'Một phiên học tuyệt vời đã khép lại. Ghi nhận thành tích vàng vào sổ tay nhé!' },
  { id: 'vic_8', category: 'victory', text: 'Ngôi sao của Lumi đang tỏa sáng rực rỡ nhất để ăn mừng cùng bạn nè ⭐✨!' },
  { id: 'vic_9', category: 'victory', text: 'Bạn thấy không? Chăm chỉ và kiên định luôn mang lại kết quả ngọt ngào.' },
  { id: 'vic_10', category: 'victory', text: 'Hãy uống một ngụm nước, vươn vai và mỉm cười thật tươi nhé. Bạn đỉnh lắm!' },
  { id: 'vic_11', category: 'victory', text: 'Nhiệm vụ hoàn thành 100%! Cảm ơn bạn vì đã đồng hành cùng Lumi suốt phiên học.' },
  { id: 'vic_12', category: 'victory', text: 'Ngày hôm nay bạn đã chiến thắng sự lười biếng một cách vẻ vang!' },

  // -------------------------------------------------------------
  // Nhóm 9: Quay lại học (Welcome Back / Chào đón ấm áp) - 12 câu
  // -------------------------------------------------------------
  { id: 'ret_1', category: 'restart', text: 'Mừng bạn quay trở lại! Lumi nhớ bạn nãy giờ nè!' },
  { id: 'ret_2', category: 'restart', text: 'Nghỉ ngơi nạp pin đủ rồi chứ bạn ơi? Chúng mình tiếp tục cuộc vui thôi nào!' },
  { id: 'ret_3', category: 'restart', text: 'Không sao nếu bạn vừa có chút việc bận, quan trọng là bạn đã quay lại đây!' },
  { id: 'ret_4', category: 'restart', text: 'Cánh cửa tri thức luôn mở rộng chờ bạn. Cùng bật chế độ năng suất nào!' },
  { id: 'ret_5', category: 'restart', text: 'Chào mừng trở lại! Lumi vẫn giữ nguyên vị trí và sẵn sàng hỗ trợ bạn rồi đây.' },
  { id: 'ret_6', category: 'restart', text: 'Bắt đầu lại bất cứ lúc nào cũng được, không bao giờ là muộn cả!' },
  { id: 'ret_7', category: 'restart', text: 'Năng lượng mới, tinh thần mới! Phiên học này chắc chắn sẽ cực kỳ hiệu quả.' },
  { id: 'ret_8', category: 'restart', text: 'Thật vui khi thấy bạn quay lại bàn học. Cùng nhau cố gắng tiếp nhé!' },
  { id: 'ret_9', category: 'restart', text: 'Chỉ cần bạn có mặt ở đây, Lumi sẽ luôn là người bạn đồng hành trung thành nhất.' },
  { id: 'ret_10', category: 'restart', text: 'Khởi động nhẹ nhàng lại một nhịp rồi chúng mình tăng tốc nào!' },
  { id: 'ret_11', category: 'restart', text: 'Tâm trí đã được làm mới, giờ là lúc biến ý chí thành kết quả cụ thể!' },
  { id: 'ret_12', category: 'restart', text: 'Đã sẵn sàng chưa bạn ơi? Ngôi sao Lumi đã bật đèn xanh rồi nè!' },

  // -------------------------------------------------------------
  // Nhóm 10: Câu bất ngờ & Cá tính của Lumi (Surprise Warmth) - 12 câu
  // -------------------------------------------------------------
  { id: 'sur_1', category: 'surprise', text: 'Ting ting! Lumi gửi bạn một túi năng lượng tích cực siêu to nè 🎁!' },
  { id: 'sur_2', category: 'surprise', text: 'Bật mí nhé: Bạn học chăm chỉ thế này làm Lumi vui đến muốn nhảy múa luôn á!' },
  { id: 'sur_3', category: 'surprise', text: 'Hôm nay bạn trông có vẻ ngầu hơn hôm qua thì phải ta? Chắc là do nạp nhiều chữ đó!' },
  { id: 'sur_4', category: 'surprise', text: 'Ngôi sao nhỏ trên tay Lumi đang ấm lên nè, chắc là do cảm nhận được quyết tâm của bạn!' },
  { id: 'sur_5', category: 'surprise', text: 'Nhắc nhẹ: Uống miếng nước cho xinh/đẹp trai nào bạn ơi 💧!' },
  { id: 'sur_6', category: 'surprise', text: 'Học là việc của bạn, tiếp thêm động lực là sứ mệnh cả đời của Lumi ✨!' },
  { id: 'sur_7', category: 'surprise', text: 'Đôi cánh nhỏ của Lumi đang đập nhẹ gửi chút gió mát lành đến bạn nè ~' },
  { id: 'sur_8', category: 'surprise', text: 'Dù ngoài kia có bao nhiêu bài tập, chúng mình cứ bình tĩnh xơi tái từng cái một!' },
  { id: 'sur_9', category: 'surprise', text: 'Thả lỏng cơ hàm và mỉm cười một cái nào, bạn cười trông đáng yêu lắm đó!' },
  { id: 'sur_10', category: 'surprise', text: 'Lumi chấm cho sự kiên trì của bạn 10/10 điểm không có nhưng!' },
  { id: 'sur_11', category: 'surprise', text: 'Có một người bạn nhỏ luôn tự hào về bạn mỗi ngày, đó chính là Lumi nè!' },
  { id: 'sur_12', category: 'surprise', text: 'Cố lên bạn ơi, ước mơ đang đứng vẫy tay ở tương lai kìa!' }
];

/**
 * Intelligent Quote Selector with sliding-window anti-repeat memory
 */
class AntiRepeatQuoteEngine {
  private recentQuoteIds: string[] = [];
  private readonly MAX_HISTORY = 25;

  /**
   * Selects a quote from the given category (or fallback pool) avoiding recent repeats
   */
  public getRandomQuote(category?: QuoteCategory): MotivationalQuote {
    let candidates = category 
      ? MOTIVATIONAL_QUOTES_POOL.filter(q => q.category === category)
      : MOTIVATIONAL_QUOTES_POOL;

    if (candidates.length === 0) {
      candidates = MOTIVATIONAL_QUOTES_POOL;
    }

    // Prevent pool starvation by capping recent history to (candidates.length - 1)
    const effectiveLimit = Math.max(1, candidates.length - 1);
    const categoryRecent = this.recentQuoteIds.filter(id => candidates.some(c => c.id === id));
    while (categoryRecent.length >= effectiveLimit) {
      const oldestId = categoryRecent.shift();
      const idx = this.recentQuoteIds.indexOf(oldestId!);
      if (idx !== -1) {
        this.recentQuoteIds.splice(idx, 1);
      }
    }

    const freshCandidates = candidates.filter(q => !this.recentQuoteIds.includes(q.id));
    const lastId = this.recentQuoteIds[this.recentQuoteIds.length - 1];

    let selected: MotivationalQuote;
    if (freshCandidates.length > 0) {
      selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
    } else {
      // Strictly exclude immediately preceding quote to prevent consecutive repeats
      const nonConsecutive = candidates.filter(q => q.id !== lastId);
      selected = nonConsecutive.length > 0
        ? nonConsecutive[Math.floor(Math.random() * nonConsecutive.length)]
        : candidates[0];
    }

    // Push into recent history
    this.recentQuoteIds.push(selected.id);
    if (this.recentQuoteIds.length > this.MAX_HISTORY) {
      this.recentQuoteIds.shift();
    }

    return selected;
  }

  /**
   * Context-aware quote selector based on real study events
   */
  public getContextualQuote(context: {
    event?: 'start' | 'flow' | 'obstacle' | 'mistake' | 'correct' | 'finish' | 'restart' | 'periodic';
    sessionDurationMinutes?: number;
    streak?: number;
  }): MotivationalQuote {
    switch (context.event) {
      case 'start':
        return this.getRandomQuote('start');
      case 'mistake':
        return this.getRandomQuote('mistake');
      case 'correct':
        return this.getRandomQuote('micro_progress');
      case 'finish':
        return this.getRandomQuote('victory');
      case 'restart':
        return this.getRandomQuote('restart');
      case 'obstacle':
        return this.getRandomQuote('obstacle');
      case 'periodic':
      default: {
        // If studied > 20 mins, alternate endurance & flow
        if (context.sessionDurationMinutes && context.sessionDurationMinutes >= 20) {
          const pool: QuoteCategory[] = ['endurance', 'flow', 'surprise'];
          const chosenCategory = pool[Math.floor(Math.random() * pool.length)];
          return this.getRandomQuote(chosenCategory);
        }
        // Early or mid flow: alternate flow, micro_progress & surprise
        const pool: QuoteCategory[] = ['flow', 'micro_progress', 'surprise'];
        const chosenCategory = pool[Math.floor(Math.random() * pool.length)];
        return this.getRandomQuote(chosenCategory);
      }
    }
  }

  public resetHistory(): void {
    this.recentQuoteIds = [];
  }
}

export const quoteEngine = new AntiRepeatQuoteEngine();
