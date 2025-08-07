// src/services/support/SupportKnowledgeBaseService.ts
import { 
  SupportTicketCategory,
  SupportLanguage,
  KnowledgeBaseStatus
} from '@prisma/client';
import { BaseService } from '../BaseService';
import { 
  SupportKnowledgeBaseRepository,
  KnowledgeBaseFilters,
  KnowledgeBaseWithDetails 
} from '@/repositories';
import { PaginationOptions, PaginatedResult, ApiResponse, AppError, HTTP_STATUS } from '@/types';
import { IDGenerators } from '@/utils/helpers/generators';

export interface CreateKnowledgeBaseRequest {
  title: string;
  content: string;
  summary?: string;
  category: SupportTicketCategory;
  subcategory?: string;
  tags?: string[];
  language: SupportLanguage;
  isPublic?: boolean;
  isFeatured?: boolean;
  authorId: string;
  searchKeywords?: string;
  relatedArticles?: string[];
  attachments?: string[];
  metadata?: any;
}

export interface UpdateKnowledgeBaseRequest {
  title?: string;
  content?: string;
  summary?: string;
  category?: SupportTicketCategory;
  subcategory?: string;
  tags?: string[];
  language?: SupportLanguage;
  isPublic?: boolean;
  isFeatured?: boolean;
  searchKeywords?: string;
  relatedArticles?: string[];
  attachments?: string[];
  metadata?: any;
}

export interface SearchKnowledgeBaseRequest {
  query: string;
  category?: SupportTicketCategory[];
  language?: SupportLanguage[];
  tags?: string[];
  includeUnpublished?: boolean;
}

export interface KnowledgeBaseStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  totalViews: number;
  totalVotes: number;
  byCategory: Record<string, number>;
  byLanguage: Record<string, number>;
  topArticles: Array<{
    id: string;
    title: string;
    viewCount: number;
    rating: number;
  }>;
  recentUpdates: Array<{
    id: string;
    title: string;
    updatedAt: Date;
    updaterName: string;
  }>;
}

export class SupportKnowledgeBaseService extends BaseService {
  constructor(
    private knowledgeBaseRepository: SupportKnowledgeBaseRepository
  ) {
    super();
  }

  async createArticle(
    data: CreateKnowledgeBaseRequest
  ): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      // Generate unique slug
      const baseSlug = IDGenerators.generateSlug(data.title);
      let slug = baseSlug;
      let counter = 1;

      // Ensure slug is unique
      while (await this.knowledgeBaseRepository.findBySlug(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Process search keywords
      const searchKeywords = data.searchKeywords || 
        this.extractKeywords(data.title + ' ' + data.content);

      // Create the article
      const article = await this.knowledgeBaseRepository.create({
        ...data,
        slug,
        searchKeywords,
        status: KnowledgeBaseStatus.DRAFT,
      });

      const articleWithDetails = await this.knowledgeBaseRepository.findById(article.id);

      return this.createSuccessResponse(
        articleWithDetails!,
        'Knowledge base article created successfully',
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      throw new AppError(
        'Failed to create knowledge base article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'KB_ARTICLE_CREATION_FAILED'
      );
    }
  }

  async getArticle(id: string, incrementView = false): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      const article = await this.knowledgeBaseRepository.findById(id);

      if (!article) {
        throw new AppError(
          'Article not found',
          HTTP_STATUS.NOT_FOUND,
          'ARTICLE_NOT_FOUND'
        );
      }

      // Increment view count if requested
      if (incrementView && article.isPublic && article.status === KnowledgeBaseStatus.PUBLISHED) {
        await this.knowledgeBaseRepository.incrementViewCount(id);
        article.viewCount += 1;
      }

      return this.createSuccessResponse(article, 'Article retrieved successfully');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_RETRIEVAL_FAILED'
      );
    }
  }

  async getArticleBySlug(slug: string, incrementView = false): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      const article = await this.knowledgeBaseRepository.findBySlug(slug);

      if (!article) {
        throw new AppError(
          'Article not found',
          HTTP_STATUS.NOT_FOUND,
          'ARTICLE_NOT_FOUND'
        );
      }

      // Increment view count if requested
      if (incrementView && article.isPublic && article.status === KnowledgeBaseStatus.PUBLISHED) {
        await this.knowledgeBaseRepository.incrementViewCount(article.id);
        article.viewCount += 1;
      }

      return this.createSuccessResponse(article, 'Article retrieved successfully');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_RETRIEVAL_FAILED'
      );
    }
  }

  async getArticles(
    filters: KnowledgeBaseFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResult<KnowledgeBaseWithDetails>>> {
    try {
      const articles = await this.knowledgeBaseRepository.findMany(filters, pagination);
      return this.createSuccessResponse(articles, 'Articles retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve articles',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLES_RETRIEVAL_FAILED'
      );
    }
  }

  async updateArticle(
    id: string,
    data: UpdateKnowledgeBaseRequest,
    updatedBy: string
  ): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      const article = await this.knowledgeBaseRepository.findById(id);

      if (!article) {
        throw new AppError(
          'Article not found',
          HTTP_STATUS.NOT_FOUND,
          'ARTICLE_NOT_FOUND'
        );
      }

      // Update slug if title changed
      let updateData = { ...data, lastUpdatedBy: updatedBy };
      
      if (data.title && data.title !== article.title) {
        const baseSlug = IDGenerators.generateSlug(data.title);
        let slug = baseSlug;
        let counter = 1;

        // Ensure new slug is unique
        while (await this.knowledgeBaseRepository.findBySlug(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        updateData.slug = slug;
      }

      // Update search keywords if content changed
      if (data.title || data.content) {
        const title = data.title || article.title;
        const content = data.content || article.content;
        updateData.searchKeywords = data.searchKeywords || this.extractKeywords(title + ' ' + content);
      }

      const updatedArticle = await this.knowledgeBaseRepository.update(id, updateData);
      const articleWithDetails = await this.knowledgeBaseRepository.findById(id);

      return this.createSuccessResponse(
        articleWithDetails!,
        'Article updated successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_UPDATE_FAILED'
      );
    }
  }

  async publishArticle(id: string, publishedBy: string): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      const article = await this.knowledgeBaseRepository.findById(id);

      if (!article) {
        throw new AppError(
          'Article not found',
          HTTP_STATUS.NOT_FOUND,
          'ARTICLE_NOT_FOUND'
        );
      }

      if (article.status === KnowledgeBaseStatus.PUBLISHED) {
        throw new AppError(
          'Article is already published',
          HTTP_STATUS.BAD_REQUEST,
          'ARTICLE_ALREADY_PUBLISHED'
        );
      }

      await this.knowledgeBaseRepository.publish(id, publishedBy);
      const publishedArticle = await this.knowledgeBaseRepository.findById(id);

      return this.createSuccessResponse(
        publishedArticle!,
        'Article published successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to publish article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_PUBLISH_FAILED'
      );
    }
  }

  async archiveArticle(id: string, archivedBy: string): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      const article = await this.knowledgeBaseRepository.findById(id);

      if (!article) {
        throw new AppError(
          'Article not found',
          HTTP_STATUS.NOT_FOUND,
          'ARTICLE_NOT_FOUND'
        );
      }

      await this.knowledgeBaseRepository.archive(id, archivedBy);
      const archivedArticle = await this.knowledgeBaseRepository.findById(id);

      return this.createSuccessResponse(
        archivedArticle!,
        'Article archived successfully'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to archive article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_ARCHIVE_FAILED'
      );
    }
  }

  async deleteArticle(id: string): Promise<ApiResponse<null>> {
    try {
      const article = await this.knowledgeBaseRepository.findById(id);

      if (!article) {
        throw new AppError(
          'Article not found',
          HTTP_STATUS.NOT_FOUND,
          'ARTICLE_NOT_FOUND'
        );
      }

      await this.knowledgeBaseRepository.delete(id);

      return this.createSuccessResponse(null, 'Article deleted successfully');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to delete article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_DELETE_FAILED'
      );
    }
  }

  async searchArticles(
    searchRequest: SearchKnowledgeBaseRequest,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResult<KnowledgeBaseWithDetails>>> {
    try {
      const filters: Omit<KnowledgeBaseFilters, 'search'> = {
        category: searchRequest.category,
        language: searchRequest.language,
        tags: searchRequest.tags,
      };

      // Add status filter for public search
      if (!searchRequest.includeUnpublished) {
        filters.status = [KnowledgeBaseStatus.PUBLISHED];
        filters.isPublic = true;
      }

      const results = await this.knowledgeBaseRepository.search(
        searchRequest.query,
        filters,
        pagination
      );

      return this.createSuccessResponse(results, 'Search completed successfully');
    } catch (error) {
      throw new AppError(
        'Failed to search articles',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'SEARCH_FAILED'
      );
    }
  }

  async getFeaturedArticles(
    category?: SupportTicketCategory,
    language: SupportLanguage = SupportLanguage.ENGLISH,
    limit = 5
  ): Promise<ApiResponse<KnowledgeBaseWithDetails[]>> {
    try {
      const articles = await this.knowledgeBaseRepository.getFeatured(category, language, limit);
      return this.createSuccessResponse(articles, 'Featured articles retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve featured articles',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'FEATURED_ARTICLES_RETRIEVAL_FAILED'
      );
    }
  }

  async getPopularArticles(
    category?: SupportTicketCategory,
    language: SupportLanguage = SupportLanguage.ENGLISH,
    limit = 10
  ): Promise<ApiResponse<KnowledgeBaseWithDetails[]>> {
    try {
      const articles = await this.knowledgeBaseRepository.getPopular(category, language, limit);
      return this.createSuccessResponse(articles, 'Popular articles retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve popular articles',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'POPULAR_ARTICLES_RETRIEVAL_FAILED'
      );
    }
  }

  async getRelatedArticles(id: string, limit = 5): Promise<ApiResponse<KnowledgeBaseWithDetails[]>> {
    try {
      const articles = await this.knowledgeBaseRepository.getRelated(id, limit);
      return this.createSuccessResponse(articles, 'Related articles retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve related articles',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'RELATED_ARTICLES_RETRIEVAL_FAILED'
      );
    }
  }

  async voteArticle(id: string, helpful: boolean): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      const article = await this.knowledgeBaseRepository.findById(id);

      if (!article) {
        throw new AppError(
          'Article not found',
          HTTP_STATUS.NOT_FOUND,
          'ARTICLE_NOT_FOUND'
        );
      }

      if (article.status !== KnowledgeBaseStatus.PUBLISHED || !article.isPublic) {
        throw new AppError(
          'Cannot vote on unpublished or private article',
          HTTP_STATUS.BAD_REQUEST,
          'ARTICLE_NOT_VOTABLE'
        );
      }

      if (helpful) {
        await this.knowledgeBaseRepository.voteHelpful(id);
      } else {
        await this.knowledgeBaseRepository.voteUnhelpful(id);
      }

      const updatedArticle = await this.knowledgeBaseRepository.findById(id);

      return this.createSuccessResponse(
        updatedArticle!,
        helpful ? 'Voted as helpful' : 'Voted as not helpful'
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to vote on article',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_VOTE_FAILED'
      );
    }
  }

  async getStats(): Promise<ApiResponse<KnowledgeBaseStats>> {
    try {
      const [
        basicStats,
        topArticles,
        recentUpdates,
      ] = await Promise.all([
        this.knowledgeBaseRepository.getStats(),
        this.getTopPerformingArticles(),
        this.getRecentlyUpdatedArticles(),
      ]);

      const stats: KnowledgeBaseStats = {
        ...basicStats,
        topArticles,
        recentUpdates,
      };

      return this.createSuccessResponse(stats, 'Knowledge base statistics retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve knowledge base statistics',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'KB_STATS_RETRIEVAL_FAILED'
      );
    }
  }

  async suggestArticles(
    ticketCategory: SupportTicketCategory,
    ticketDescription: string,
    language: SupportLanguage = SupportLanguage.ENGLISH,
    limit = 5
  ): Promise<ApiResponse<KnowledgeBaseWithDetails[]>> {
    try {
      // Extract keywords from ticket description
      const keywords = this.extractKeywords(ticketDescription);
      
      // Search for relevant articles
      const searchResults = await this.knowledgeBaseRepository.search(
        keywords,
        {
          category: [ticketCategory],
          language: [language],
          status: [KnowledgeBaseStatus.PUBLISHED],
          isPublic: true,
        },
        { page: 1, limit }
      );

      return this.createSuccessResponse(
        searchResults.items,
        'Article suggestions retrieved successfully'
      );
    } catch (error) {
      throw new AppError(
        'Failed to retrieve article suggestions',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'ARTICLE_SUGGESTIONS_FAILED'
      );
    }
  }

  async getArticlesByAuthor(
    authorId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResult<KnowledgeBaseWithDetails>>> {
    try {
      const articles = await this.knowledgeBaseRepository.findMany(
        { authorId },
        pagination
      );

      return this.createSuccessResponse(articles, 'Author articles retrieved successfully');
    } catch (error) {
      throw new AppError(
        'Failed to retrieve author articles',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AUTHOR_ARTICLES_RETRIEVAL_FAILED'
      );
    }
  }

  // Nigerian Market Specific Features
  async getArticlesByNigerianContext(
    language: SupportLanguage,
    state?: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResult<KnowledgeBaseWithDetails>>> {
    try {
      const filters: KnowledgeBaseFilters = {
        language: [language],
        status: [KnowledgeBaseStatus.PUBLISHED],
        isPublic: true,
      };

      // Add state-specific filtering if needed
      if (state) {
        filters.tags = [`state-${state.toLowerCase()}`];
      }

      const articles = await this.knowledgeBaseRepository.findMany(filters, pagination);

      return this.createSuccessResponse(
        articles, 
        'Nigerian context articles retrieved successfully'
      );
    } catch (error) {
      throw new AppError(
        'Failed to retrieve Nigerian context articles',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'NIGERIAN_ARTICLES_RETRIEVAL_FAILED'
      );
    }
  }

  async createNigerianPaymentGuide(
    authorId: string,
    paymentMethod: string,
    language: SupportLanguage = SupportLanguage.ENGLISH
  ): Promise<ApiResponse<KnowledgeBaseWithDetails>> {
    try {
      const title = `How to Pay Using ${paymentMethod} in Nigeria`;
      const content = this.generateNigerianPaymentGuide(paymentMethod);

      const article = await this.createArticle({
        title,
        content,
        summary: `Step-by-step guide for making payments using ${paymentMethod} in Nigeria`,
        category: SupportTicketCategory.PAYMENT_PROBLEMS,
        subcategory: paymentMethod.toLowerCase(),
        tags: ['payment', 'nigeria', paymentMethod.toLowerCase(), 'guide'],
        language,
        isPublic: true,
        isFeatured: true,
        authorId,
        searchKeywords: `${paymentMethod} payment nigeria guide how to pay`,
      });

      return article;
    } catch (error) {
      throw new AppError(
        'Failed to create Nigerian payment guide',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'PAYMENT_GUIDE_CREATION_FAILED'
      );
    }
  }

  // Private helper methods
  private extractKeywords(text: string): string {
    // Simple keyword extraction - in production, use more sophisticated NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all'].includes(word));

    return [...new Set(words)].slice(0, 20).join(' ');
  }

  private async getTopPerformingArticles(limit = 10): Promise<Array<{
    id: string;
    title: string;
    viewCount: number;
    rating: number;
  }>> {
    const articles = await this.db.supportKnowledgeBase.findMany({
      where: {
        status: KnowledgeBaseStatus.PUBLISHED,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        viewCount: true,
        helpfulVotes: true,
        unhelpfulVotes: true,
      },
      orderBy: {
        viewCount: 'desc',
      },
      take: limit,
    });

    return articles.map(article => ({
      id: article.id,
      title: article.title,
      viewCount: article.viewCount,
      rating: this.calculateRating(article.helpfulVotes, article.unhelpfulVotes),
    }));
  }

  private async getRecentlyUpdatedArticles(limit = 10): Promise<Array<{
    id: string;
    title: string;
    updatedAt: Date;
    updaterName: string;
  }>> {
    const articles = await this.db.supportKnowledgeBase.findMany({
      where: {
        status: KnowledgeBaseStatus.PUBLISHED,
      },
      include: {
        updater: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    return articles.map(article => ({
      id: article.id,
      title: article.title,
      updatedAt: article.updatedAt,
      updaterName: article.updater ? 
        `${article.updater.firstName} ${article.updater.lastName}` : 
        'System',
    }));
  }

  private calculateRating(helpful: number, unhelpful: number): number {
    const total = helpful + unhelpful;
    if (total === 0) return 0;
    return (helpful / total) * 5; // Scale to 5-star rating
  }

  private generateNigerianPaymentGuide(paymentMethod: string): string {
    const guides: Record<string, string> = {
      'bank-transfer': `
# How to Make Bank Transfer Payments in Nigeria

## Step 1: Get Payment Details
- Account Name: [Merchant Name]
- Account Number: [Account Number]
- Bank Name: [Bank Name]

## Step 2: Using Mobile Banking
1. Open your bank's mobile app
2. Select "Transfer" or "Send Money"
3. Enter the merchant's account details
4. Enter the payment amount
5. Add payment reference from your order
6. Confirm and complete the transfer

## Step 3: Using USSD
1. Dial your bank's USSD code
2. Select transfer option
3. Follow prompts to enter recipient details
4. Enter amount and confirm

## Step 4: Confirm Payment
- Save your transaction receipt
- Note the transaction reference
- Your order will be confirmed within 2-4 hours

## Common Issues
- Ensure you have sufficient balance
- Double-check account details
- Contact your bank if transfer fails
      `.trim(),

      'ussd': `
# How to Pay Using USSD in Nigeria

## Supported Banks and Codes
- GTBank: *737#
- First Bank: *894#
- Access Bank: *901#
- UBA: *919#
- Zenith Bank: *966#

## Payment Steps
1. Dial your bank's USSD code
2. Select "Pay Bills" or "Merchant Payment"
3. Choose "E-commerce" or "Online Shopping"
4. Enter merchant code: [MERCHANT_CODE]
5. Enter your order reference number
6. Enter payment amount
7. Enter your PIN to confirm

## What You Need
- Active phone line linked to your bank account
- Sufficient account balance
- Your order reference number

## Troubleshooting
- Ensure you're using the phone number linked to your account
- Check that you have network coverage
- Verify your account balance
- Contact your bank for PIN issues
      `.trim(),

      'card': `
# How to Pay with Card in Nigeria

## Supported Cards
- Verve Cards
- Mastercard
- Visa
- Local Bank Cards

## Payment Process
1. Select "Pay with Card" at checkout
2. Enter your card details:
   - Card number (16 digits)
   - Expiry date (MM/YY)
   - CVV (3 digits on back)
   - Cardholder name
3. Click "Pay Now"
4. You may be redirected to your bank for authorization
5. Enter your PIN or OTP when prompted
6. Complete the payment

## Security Tips
- Only shop on secure sites (look for https://)
- Never share your PIN or card details
- Check your bank statements regularly
- Report suspicious transactions immediately

## Common Issues
- Ensure your card is enabled for online payments
- Check that you have sufficient balance
- Contact your bank if payment is declined
- Try again if you experience network issues
      `.trim(),
    };

    return guides[paymentMethod.toLowerCase()] || 
           'Payment guide not available for this method.';
  }
}