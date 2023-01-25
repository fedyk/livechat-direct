export class ErrorWithType extends Error {
  type: string
  status: number
  data: any

  constructor(message: string, type: string, status: number, data?: any) {
    super(message);

    this.type = type
    this.status = status
    this.data = data || {}
  }
}
