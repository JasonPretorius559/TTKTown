export type Figure = {
  id: string; slug: string; name: string; franchise: string; character: string;
  manufacturer: string; series: string; scale: string; releaseYear: number;
  description: string; image: string; images?: string[]; imagePathnames?: string[]; owned?: number; wanted?: number;
  verificationStatus?: "VERIFIED"|"COMMUNITY"; moderationStatus?: "PENDING"|"APPROVED"|"REJECTED"|"MERGED";
  submittedBy?:string; sourceRequestId?:string; canonicalFigureId?:string;
};

export type Listing = {
  id: string; figureId: string; sellerId: string; title: string; price: number; condition: string;
  seller: string; sellerName: string; sellerAvatar: string; image: string; images?: string[]; imagePathnames?: string[];
  description: string; status: "ACTIVE" | "DRAFT" | "RESERVED" | "SOLD";
};

export type Post = {
  id: string; author: string; displayName: string; avatar: string; image: string; images?: string[]; imagePathnames?: string[];
  authorId?: string; caption: string; likes: number; comments: number; liked?: boolean; time: string;
  figureId?: string; listingId?: string; audience?: "PUBLIC" | "FOLLOWERS";
};
export type PostLike = { id:string; postId:string; userId:string; createdAt?:unknown };
export type CommentItem = {
  id:string; postId:string; authorId:string; authorUsername:string; authorName:string; authorAvatar:string;
  parentId:string|null; depth:number; content:string; likeCount:number; replyCount:number;
  createdAt?:unknown; updatedAt?:unknown; deletedAt?:unknown; pending?:boolean; failed?:boolean;
};
export type CommentLike = { id:string; postId:string; commentId:string; userId:string; createdAt?:unknown };
export type SavedPost = { id:string; postId:string; userId:string; createdAt?:unknown };

export type CollectionItem = { id:string; userId:string; figureId:string; quantity:number; condition?:string; notes?:string; figure?:Figure };
export type FigureCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
export type BoxCondition = "SEALED" | "GOOD" | "DAMAGED" | "NO_BOX";
export type AcquisitionType = "PURCHASE" | "GIFT" | "TRADE" | "OTHER";
export type CollectionVisibility = "PRIVATE" | "FOLLOWERS" | "PUBLIC";
export type OwnedFigure = {
  id:string; userId:string; figureId:string; condition:FigureCondition; boxCondition:BoxCondition;
  acquisitionType:AcquisitionType; purchasePrice?:number; currency:"ZAR"; acquiredAt?:string;
  purchasedFrom?:string; notes?:string; isFavourite:boolean; isForSale:boolean;
  createdAt?:unknown; updatedAt?:unknown;
};
export type UserCollection = {
  id:string; userId:string; name:string; description:string; visibility:CollectionVisibility;
  coverImageUrl?:string; createdAt?:unknown; updatedAt?:unknown;
};
export type CollectionFigure = {
  id:string; userId:string; collectionId:string; ownedFigureId:string; figureId:string;
  sortOrder:number; condition?:FigureCondition; boxCondition?:BoxCondition; isFavourite?:boolean; isForSale?:boolean;
  createdAt?:unknown; updatedAt?:unknown;
};
export type WishlistItem = { id:string; userId:string; figureId:string; priority:number; notes?:string; figure?:Figure };
export type Conversation = { id:string; memberIds:string[]; memberNames?:Record<string,string>; lastMessage?:string; updatedAt?:unknown };
export type Message = { id:string; conversationId:string; senderId:string; content:string; createdAt?:unknown; readAt?:unknown };
export type Order = { id:string; listingId:string; buyerId:string; sellerId:string; amountCents:number; currency:string; status:string; trackingNumber?:string; courier?:string; title?:string; image?:string };
export type Report = { id:string; reporterId:string; targetType:string; targetId:string; reason:string; details?:string; status:string };
export type FigureRequest = {
  id:string; requesterId:string; requesterUsername:string; name:string; franchise:string; manufacturer:string; notes:string;
  status:"PENDING"|"APPROVED"|"REJECTED"; figureId:string; reviewedBy?:string; reviewReason?:string;
  createdAt?:unknown; updatedAt?:unknown; reviewedAt?:unknown;
};
export type CatalogueCandidate = {
  id:string; source:"EBAY"|"FUNKO"|"MATTEL"|"MCFARLANE"|"HOT_WHEELS_WIKI"|"POKEMON_TCG_WIKI"|"GCD"|"WEB"; sourceId:string; sourceUrl:string; sourceQuery:string; fingerprint:string; sourceLicense?:string;
  name:string; franchise:string; character:string; manufacturer:string; series:string; scale:string;
  releaseYear:number|null; description:string; referenceImageUrl:string; referenceImagePathname?:string; sourcePrice?:number; sourceCurrency?:string;
  status:"PENDING"|"APPROVED"|"REJECTED"|"DUPLICATE"; possibleDuplicateIds?:string[];
  importRunId:string; createdAt?:unknown; updatedAt?:unknown; lastSeenAt?:unknown; reviewedAt?:unknown; figureId?:string;
  reviewedBy?:string; approvalMode?:"AUTOMATIC"|"MANUAL";
};
export type CatalogueImportRun = {
  id:string; source:CatalogueCandidate["source"]; franchise:string; status:"RUNNING"|"COMPLETED"|"FAILED";
  queries:string[]; discovered:number; staged:number; error?:string; createdBy:string;
  createdAt?:unknown; updatedAt?:unknown; completedAt?:unknown;
};

export type NotificationItem = { id: string; type: string; title: string; body: string; time: string; read: boolean; href?:string };

export type UserProfile = {
  uid: string; email: string; username: string; displayName: string; avatar: string;
  bio: string; location: string; website: string; role: "USER" | "MODERATOR" | "ADMIN";
};
