import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { createNoteSchema, updateNoteSchema } from "@/lib/validations/note"

const noteAuthorInclude = {
  author: { select: { firstName: true, lastName: true } },
}

const NOTE_LIST_LIMIT = 100

export const noteRouter = router({
  list: protectedProcedure
    .input(z.object({ candidateId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const notes = await ctx.db.note.findMany({
        where: {
          candidateId: input.candidateId,
          companyId: ctx.companyId,
        },
        orderBy: { createdAt: "asc" },
        take: NOTE_LIST_LIMIT,
        include: noteAuthorInclude,
      })
      return notes
    }),

  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" })
      if (input.candidateId) {
        const candidate = await ctx.db.candidate.findFirst({
          where: { id: input.candidateId, companyId: ctx.companyId },
        })
        if (!candidate) throw new TRPCError({ code: "NOT_FOUND" })
      }
      if (input.offerId) {
        const offer = await ctx.db.jobOffer.findFirst({
          where: { id: input.offerId, companyId: ctx.companyId },
        })
        if (!offer) throw new TRPCError({ code: "NOT_FOUND" })
      }
      return ctx.db.note.create({
        data: {
          candidateId: input.candidateId ?? null,
          offerId: input.offerId ?? null,
          title: input.title?.trim() || null,
          content: input.content,
          authorId: ctx.user.id,
          companyId: ctx.companyId,
        },
        include: noteAuthorInclude,
      })
    }),

  listFree: protectedProcedure.query(async ({ ctx }) => {
    const notes = await ctx.db.note.findMany({
      where: {
        companyId: ctx.companyId,
        candidateId: null,
        offerId: null,
      },
      orderBy: { updatedAt: "desc" },
      take: NOTE_LIST_LIMIT,
      include: noteAuthorInclude,
    })
    return notes
  }),

  update: protectedProcedure
    .input(updateNoteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" })
      const existing = await ctx.db.note.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }
      if (existing.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }
      const data: { content?: string; title?: string | null } = {}
      if (input.content !== undefined) data.content = input.content
      if (input.title !== undefined) data.title = input.title?.trim() || null
      return ctx.db.note.update({
        where: { id: input.id },
        data,
        include: noteAuthorInclude,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" })
      const existing = await ctx.db.note.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }
      if (existing.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }
      await ctx.db.note.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
