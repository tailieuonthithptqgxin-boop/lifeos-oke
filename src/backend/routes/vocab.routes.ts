import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware.js';
import { vocabService } from '../services/vocab.service.js';

export const vocabRouter = Router();

// Require authenticated user for all vocab actions
vocabRouter.use(requireAuth);

/**
 * GET /api/vocab/analytics
 * Retrieves user's memory pyramid distribution, today's review words, weak words, and stats
 */
vocabRouter.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const languageId = (req.query.languageId as string) || 'en';
    const analytics = await vocabService.getDashboardAnalytics(userId, languageId);
    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    console.error('[Vocab API] Error fetching analytics:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tải dữ liệu tiến độ từ vựng' });
  }
});

/**
 * POST /api/vocab/review
 * Records an exercise review outcome (Flashcard, Reverse, Quiz, Spelling)
 */
vocabRouter.post('/review', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      wordId,
      languageId,
      term,
      meaning,
      phonetic,
      partOfSpeech,
      exerciseType,
      rating,
      isCorrect,
      responseTimeMs
    } = req.body;

    if (!wordId || !term || !meaning || !exerciseType || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: wordId, term, meaning, exerciseType, rating'
      });
    }

    const result = await vocabService.recordReview(userId, {
      wordId,
      languageId: languageId || 'en',
      term,
      meaning,
      phonetic,
      partOfSpeech,
      exerciseType,
      rating: Number(rating) as 1 | 2 | 3 | 4,
      isCorrect,
      responseTimeMs: responseTimeMs ? Number(responseTimeMs) : undefined
    });

    res.json({
      success: true,
      data: result,
      message: 'Ghi nhận kết quả luyện tập thành công'
    });
  } catch (error: any) {
    console.error('[Vocab API] Error recording review:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi lưu kết quả ôn tập' });
  }
});

/**
 * GET /api/vocab/history
 * Retrieves user's chronological learning history and logs
 */
vocabRouter.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = await vocabService.getLearningHistory(userId, limit);
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('[Vocab API] Error fetching history:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi tải lịch sử học' });
  }
});

/**
 * POST /api/vocab/sync
 * Bulk syncs local word data to Postgres
 */
vocabRouter.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { languageId = 'en', words = [] } = req.body;
    const result = await vocabService.syncWordsBatch(userId, languageId, words);
    res.json({
      success: true,
      data: result,
      message: `Đã đồng bộ ${result.count} từ vào cơ sở dữ liệu`
    });
  } catch (error: any) {
    console.error('[Vocab API] Error syncing vocab words:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi đồng bộ từ vựng' });
  }
});
